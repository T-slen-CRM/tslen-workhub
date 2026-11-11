# Production secrets with Bitwarden Secrets Manager

This is an **optional** setup for the Docker/GHCR production deployment
described in the main `README.md` (`deploy-image.sh`). It replaces the
hand-maintained plaintext `.env` on the server with
[Bitwarden Secrets Manager](https://bitwarden.com/products/secrets-manager/)
as the single source of truth, and injects secrets at deploy time without
writing them to disk.

All values below are placeholders — substitute your own. Keep real project
IDs, tokens, hostnames and secret values out of the repo (this file is
tracked and the repo is public).

## Why

Without it, runtime secrets live in two plaintext copies — the server's
`.env` and (in older setups) a full copy in a GitHub Actions secret — with
no history, no audit trail and no easy rotation. With it:

- **One source of truth** with change history and an access log, editable
  from the Bitwarden web UI.
- **CI never sees runtime secrets.** The build only gets the few public
  values baked into the frontend bundle, from repo *variables*.
- **No plaintext secrets file on the server.** `deploy-image.sh` pipes the
  fetched values straight into `docker run --env-file`.
- The only secret left on disk is a **read-only** machine-account token
  scoped to one project, which you can revoke and reissue in seconds.

Honest limits: the token on disk can read every secret in the project, so
whoever owns the `deploy` user (or root) still effectively owns the
secrets — same as before. And anyone in the `docker` group can read a
running container's env via `docker inspect`. This setup is about removing
copies and enabling rotation, not about hiding secrets from the host.

## How it fits this stack

| Piece | Role |
|---|---|
| `scripts/bws-env.sh` | Fetches the project's secrets, validates them (valid env names, unique, single-line), prints `KEY=VALUE` — or with `run -- CMD`, exports them into `CMD`'s environment. |
| `scripts/bws-import-env.sh` | One-time migration of an existing `.env` (plus JSON credential files, inlined) into the project. Skips keys that already exist; never prints values. |
| `deploy-image.sh` | Uses Bitwarden when `~/.config/tslen-workhub/bws.conf` exists, otherwise falls back to `.env`. Fetches **before** stopping the old container, so a Bitwarden outage fails the deploy instead of the site. |
| `~/.config/tslen-workhub/bws.conf` | Project ID + path to the token file (mode `600`). |

Note: `bws` itself has `-o env` and `bws run`, but `-o env` wraps values in
double quotes, which `docker --env-file` keeps literally, and neither
validates anything — hence the wrapper.

## Setup

### 1. Bitwarden side (web vault)

1. In an organization, enable **Secrets Manager** (the free plan is
   enough for one deployment).
2. Create a **project**, e.g. `myapp-prod`. Copy its ID.
3. Create a **machine account**, e.g. `myapp-prod-deploy`, give it
   **Can read** on that project only, and generate an **access token**.
   For the one-time import, temporarily create a second token on a
   machine account with **Can read, write** (or grant write, import,
   then drop it back to read).

### 2. Server side (as the `deploy` user)

Install the CLI and `jq` (check the latest release at
<https://github.com/bitwarden/sdk-sm/releases>, verify the checksum):

```bash
sudo apt-get install -y jq unzip
VER=2.1.0   # latest bws-v* release
cd "$(mktemp -d)"
curl -fsSLO "https://github.com/bitwarden/sdk-sm/releases/download/bws-v$VER/bws-x86_64-unknown-linux-gnu-$VER.zip"
curl -fsSLO "https://github.com/bitwarden/sdk-sm/releases/download/bws-v$VER/bws-sha256-checksums-$VER.txt"
sha256sum -c --ignore-missing "bws-sha256-checksums-$VER.txt"
unzip bws-*.zip && sudo install -m 755 bws /usr/local/bin/bws
```

Make sure the repo checkout is current (`git pull`) - `deploy-image.sh`
runs `scripts/bws-env.sh` from it, and the GHCR deploy only pulls the
image, so script updates reach the server only through the checkout.

Store both tokens without them touching shell history or the terminal
(do this in a plain SSH session, not by editing the files in an editor,
which can keep copies in swap/history files):

```bash
install -d -m 700 ~/.config/tslen-workhub
umask 077
read -rs -p 'Read-only access token: ' T && printf '%s' "$T" > ~/.config/tslen-workhub/bws-access-token && unset T; echo
read -rs -p 'Read/write import token: ' T && printf '%s' "$T" > ~/.config/tslen-workhub/bws-import-token && unset T; echo
```

Write an **import-only** config. Don't create `bws.conf` yet:
`deploy-image.sh` switches to Bitwarden as soon as that file exists, and
an auto-deploy firing mid-import would ship a partial set of secrets.

```bash
cat > ~/.config/tslen-workhub/import.conf <<'EOF'
BWS_PROJECT_ID=00000000-0000-0000-0000-000000000000
BWS_ACCESS_TOKEN_FILE=$HOME/.config/tslen-workhub/bws-access-token
# BWS_SERVER_URL=https://vault.bitwarden.eu    # only if your org is on the EU cloud
EOF
```

Check the deploy token really is read-only - this create must be
refused. If it succeeds, set the machine account's project permission to
**Can read** and delete the `ZZ_PROBE` secret in the web UI:

```bash
( set -a; . ~/.config/tslen-workhub/import.conf
  BWS_ACCESS_TOKEN="$(cat "$BWS_ACCESS_TOKEN_FILE")"
  bws secret create --output none -- ZZ_PROBE x "$BWS_PROJECT_ID" ) \
  && echo "NOT READ-ONLY - fix it" || echo "refused - good"
```

### 3. Import the existing `.env`

With the read/write token (`BWS_IMPORT_ACCESS_TOKEN_FILE=...` overrides
the token file for the import only):

```bash
cd ~/myapp
export TSLEN_BWS_CONFIG=~/.config/tslen-workhub/import.conf
BWS_IMPORT_ACCESS_TOKEN_FILE=~/.config/tslen-workhub/bws-import-token \
  scripts/bws-import-env.sh .env \
    FIREBASE_SERVICE_ACCOUNT=credentials/firebase-adminsdk.json \
    GOOGLE_CREDENTIALS_PATH=credentials/client_secret.json
shred -u ~/.config/tslen-workhub/bws-import-token
```

The two overrides inline those JSON files (minified) as the secret value —
the app accepts either a `.json` path or the JSON itself for both. Then
revoke the read/write token in Bitwarden.

The import paces itself and retries only on Bitwarden's rate limit
(`429 Slow down`). Any other failure stops it without retrying, since
that create may have gone through server-side; just re-run the same
command - keys already in the project are skipped.

Check what the deploy would get, **names only**:

```bash
scripts/bws-env.sh | cut -d= -f1
diff <(grep -E '^[A-Za-z_]' .env | cut -d= -f1 | sort) <(scripts/bws-env.sh | cut -d= -f1 | sort)
```

(Expected differences: empty values in `.env` are skipped.)

### 4. Switch over

1. Turn the import config into the deploy config, adding the keys a
   deploy must never go out without:
   ```bash
   cp ~/.config/tslen-workhub/import.conf ~/.config/tslen-workhub/bws.conf
   echo 'REQUIRED_KEYS="JWT_SECRET DB_PASSWORD BACKEND_DOMAIN"' >> ~/.config/tslen-workhub/bws.conf
   unset TSLEN_BWS_CONFIG
   ```
2. Deploy once with Bitwarden (`./deploy-image.sh`) and check the app.
3. **Every** compose service that interpolates `${VAR}`s - `cloudflared`
   (`CLOUDFLARE_TUNNEL_TOKEN`), Traefik (`ACME_EMAIL`), Postgres
   (`DB_*`) - must from now on be (re)started through the wrapper, since
   there will be no `.env` for Compose to auto-load:
   ```bash
   scripts/bws-env.sh run -- docker compose -f docker-compose.cloudflared.yml up -d
   scripts/bws-env.sh run -- docker compose -f docker-compose.traefik.yml up -d
   scripts/bws-env.sh run -- docker compose -f docker-compose.postgres.yml up -d
   ```
   Restart each through it once now, before removing `.env`, to prove it
   works.
4. Once everything is healthy, move the old `.env` off the server (keep an
   encrypted offline copy until you've rotated, then destroy it), and
   delete the `PROD_ENV_FILE` GitHub secret if you had one.

Still needing a real `.env` file: `start.sh` (the build-on-the-server
fallback - the Dockerfile COPYs `.env` for the frontend build) and the
local-dev `docker-compose.yml` (`env_file: .env`). Neither is on the GHCR
deploy path. If you need `start.sh` on the server, render a temporary
file first (`scripts/bws-env.sh > .env && chmod 600 .env`), run it, then
`shred -u .env`.

## Runtime state that stays on disk

`credentials/token_<userId>.json` are per-user Google OAuth refresh tokens
the app **writes** at runtime — state, not config — so they stay in the
mounted `credentials/` volume. Keep that directory `700` and its files
`600`. Each token file embeds a copy of the Google OAuth client secret,
which matters for rotation below.

## Rotating a secret

1. Change the value in the Bitwarden web UI (or `bws secret edit`).
2. Redeploy: `./deploy-image.sh` (or re-run the compose command for the
   service that uses it).
3. Revoke the old value at its issuer.

Per-secret notes:

- **`JWT_SECRET`** — rotating logs every user out.
- **`DB_PASSWORD`** — change it in Postgres first
  (`ALTER ROLE ... PASSWORD ...`), then in Bitwarden, then redeploy.
- **Google OAuth client secret** — add a new secret in Google Cloud
  Console, update Bitwarden, redeploy, and only then disable the old one;
  users whose stored `token_*.json` still embeds the old secret will need
  to reconnect Google afterwards.
- **Cloudflare tunnel token** — rotate in the Zero Trust dashboard, update
  Bitwarden, restart `cloudflared` through the wrapper.
- **Bitwarden access token itself** — issue a new one for the machine
  account, write it over `bws-access-token`, revoke the old one.

## Reverting

Recreate `.env` from Bitwarden (`scripts/bws-env.sh > .env && chmod 600
.env`) and move `bws.conf` aside — `deploy-image.sh` falls back to `.env`
automatically, and Compose auto-loads it again for the
Traefik/Postgres/cloudflared files.
