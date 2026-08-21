# Docker Compose Self-Hosted Quickstart — Design

## Problem

There is no `docker-compose.yml`. The only container path today is a
single `Dockerfile` plus `start.sh.example`, a manual `docker run` script
that assumes Postgres is already running somewhere else, a Docker network
named `tslen-net` already exists, and a Traefik instance is already
watching that network for TLS termination. None of that is true on a
fresh clone — there is no genuine "clone the repo, run one command, get a
working app" path for someone with zero prior setup.

Two things independently block that path even if a compose file existed:

1. **Firebase Storage is a hard boot-blocker.** `FirebaseModule`
   (`src/common/services/firebase/firebase.module.ts`) eagerly constructs
   `FirebaseService` and awaits `init()` in its provider factory. `init()`
   reads and parses the Firebase service-account JSON
   (`FIREBASE_SERVICE_ACCOUNT`). If that file is missing or invalid, the
   factory throws and Nest's DI container fails to build — the app never
   reaches `app.listen()`. Firebase Storage requires a Google Cloud
   project, so this alone makes a truly from-scratch deploy impossible
   without external account setup first.
2. **Migrations can't run from the current production image.**
   `npm run migration:run` shells out to `typeorm-ts-node-commonjs`
   against `typeOrm.config.ts` and `migrations/*.ts` directly (never
   compiled — `tsconfig.build.json` explicitly excludes both
   `typeOrm.config.ts` and `migrations` from `nest build`). The
   Dockerfile's final stage runs `npm ci --omit=dev` (dropping `ts-node`
   and `typescript`) and never copies `migrations/` or
   `typeOrm.config.ts` into the image, so the command that would run
   migrations doesn't have what it needs even if invoked.

Everything else that looks like a self-hosting blocker (Google
Calendar/Meet OAuth, Slack notifications) is not: both are read lazily
and only fail when the corresponding feature is actually used, not at
boot, as long as their env vars are set to *some* string.

## Goal

`docker compose up` on a fresh clone brings up a working app (Postgres +
LiveKit + the Nest/Angular app) on `localhost`, with migrations applied
automatically, no external SaaS account required to boot. This is a
local/eval quickstart, not a production TLS deploy — `start.sh.example` +
Traefik remains the documented path for a public HTTPS deployment; that
path is unchanged by this work.

Out of scope for this pass (tracked as separate follow-up work):

- Replacing Firebase with a pluggable local-disk storage backend
  (`UploadAbstractService` already supports a second implementation —
  this pass only stops it from blocking boot, it doesn't add the
  alternative).
- Traefik/TLS inside Compose.
- Any change to how Google OAuth or Slack are configured — both stay
  optional exactly as they are today.

### Correction found during planning: LiveKit is not actually wired up

The original version of this design assumed the backend's `LIVE_KIT_SERVER`
env var addressed a self-hostable LiveKit media server, and planned to
point it at a `livekit` Compose service. Both assumptions were wrong:

- `LIVE_KIT_SERVER` (used in `src/main.ts` and
  `src/resources/live-kit/live-kit.module.ts`) is the address this same
  Nest process uses to gRPC-call *itself* (`proto/live-kit.proto`'s
  `LiveKitMicroservice`, implemented by its own
  `LiveKitGrpcController`/`LiveKitGrpcService`) for token/webhook
  handling. It has nothing to do with the actual video/media server —
  remapping it to a `livekit` container, as originally planned, would
  have broken token generation.
- The frontend's actual LiveKit media server address is a module-level
  constant in `packages/web/src/app/pages/call/wellcome/call.component.ts:41`:
  `let LIVEKIT_URL = 'wss://<redacted-livekit-cloud-project>.livekit.cloud';` — hardcoded to
  this project's own LiveKit Cloud account, for every build and every
  environment. `configureUrls()` (same file, ~line 150) has dead fallback
  logic (`ws://localhost:7880/` for `localhost`, `wss://<hostname>:7443/`
  otherwise) guarded by `if (!LIVEKIT_URL)` — which never fires, because
  `LIVEKIT_URL` is never falsy.

So a `livekit` Compose service alone would be inert: nothing in the app
would call it. Scope is expanded to make it real:

#### Additional design: make the LiveKit URL configurable

- Add `livekitUrl: string` to `packages/web/src/environments/environment.ts`
  (dev — value `''`, so the existing fallback in `configureUrls()`
  computes `ws://localhost:7880/` when accessed via `localhost`, matching
  the Compose `livekit` service's exposed port).
- `call.component.ts`: replace the hardcoded string literal with
  `import { environment } from '../../../../environments/environment';`
  and `let LIVEKIT_URL = environment.livekitUrl;`.
- **`environment.prod.ts` itself is not committed.** The user flagged
  mid-implementation that the file already carried their real LiveKit
  Cloud project URL in git (it was tracked, with the URL baked in) and
  didn't want it there — only in gitignored local config, matching how
  `.env`/`start.sh`/`credentials/*.json` are already handled. So:
  `packages/web/.gitignore` gains `/src/environments/environment.prod.ts`;
  the real file is untracked (`git rm --cached`, left on disk unchanged
  so local builds keep working) and a checked-in
  `environment.prod.ts.example` ships instead, with `livekitUrl: ''` as
  the placeholder — same pattern as `.env.example` → `.env`. A fresh
  clone must `cp environment.prod.ts.example environment.prod.ts` and
  fill in `livekitUrl` (their own LiveKit Cloud project, a self-hosted
  server, or leave it `''` to use the Compose `livekit` service's
  `ws://localhost:7880/` fallback) before `docker compose build` — same
  pre-build setup step as every other integration in this repo. This is
  a build-time value (Angular bundles it in), not runtime-configurable
  via Compose env — documented as such.
- `docker-compose.yml`'s `livekit` service: `livekit/livekit-server:latest`
  in `--dev` mode, port `7880` published, `LIVEKIT_KEYS` env derived from
  `${LIVEKIT_API_KEY}`/`${LIVEKIT_API_SECRET}` (these keys are correct as
  originally planned — they're what `LiveKitGrpcService`'s `AccessToken`
  already signs tokens with, and LiveKit's own server needs the same pair
  to validate them). No `LIVE_KIT_SERVER` override in `app`'s environment
  block — it stays whatever `.env` has it as (default `localhost:6090`,
  the backend's internal self-call address, unaffected by Compose).

## Design

### 1. `docker-compose.yml` (new, repo root)

Three services:

- **`postgres`** — `postgres:16`. No credentials required: `POSTGRES_HOST_AUTH_METHOD: trust`
  (discovered during implementation — the repo's own `.env` has `DB_USER`/
  `DB_PASSWORD` both blank, and the official Postgres image refuses to
  start without either a non-empty `POSTGRES_PASSWORD` or trust auth; the
  user confirmed the quickstart should launch with no DB credentials at
  all rather than requiring `.env` edits or inventing placeholder ones).
  `POSTGRES_USER` is left unset so the image defaults it to its built-in
  `postgres` role; `POSTGRES_DB` sourced from `.env`'s `DB_SCHEMA`. Named
  volume `pgdata:/var/lib/postgresql/data` for persistence across
  restarts. `healthcheck` using `pg_isready -U postgres`.
- **`livekit`** — `livekit/livekit-server:latest`, `--dev` command mode,
  keys derived from `${LIVEKIT_API_KEY}`/`${LIVEKIT_API_SECRET}` via the
  `LIVEKIT_KEYS` env var LiveKit's dev mode reads. Port `7880` (client
  WS) published — see the correction below for why this is the only
  port that matters and `LIVE_KIT_SERVER` is untouched.
- **`app`** — `build: .` (existing `Dockerfile`). `depends_on` both
  `postgres` (`condition: service_healthy`) and `livekit`. `env_file:
  .env`, with an `environment:` block overriding three keys so it can
  reach the trust-auth `postgres` service above regardless of what
  `.env`'s own `DB_*` values are: `DB_HOST=postgres`, `DB_USER=postgres`,
  `DB_PASSWORD=""`. This keeps `.env.example`/`.env` unmodified for both
  bare-metal dev and Compose — Compose's `environment:` entries take
  precedence over `env_file:` values for the same key. Port `4004`
  published to host. Volumes: `./upload:/app/upload`,
  `./credentials:/app/credentials` (matching `start.sh.example`'s existing
  mounts, so the same `.env`/`credentials/` setup works whether someone
  uses `start.sh` or Compose).

### 2. Dockerfile changes (final stage only)

Two changes to the existing `Dockerfile`'s stage 3:

- Copy `migrations/` and `typeOrm.config.ts` into the image (currently
  neither is copied).
- Drop `--omit=dev` from `npm ci` in that stage, so `ts-node` and
  `typescript` (required by `typeorm-ts-node-commonjs`) are present at
  runtime. Accepted size tradeoff for a quickstart image — slimming this
  back down (e.g. a dedicated migration step with its own smaller image)
  is a possible future optimization, not needed now.

### 3. `docker-entrypoint.sh` (new)

```bash
#!/usr/bin/env bash
set -euo pipefail
if [ "${MODE:-}" != "DEV" ]; then
  npm run migration:run
fi
exec node dist/main.js
```

Dockerfile's final `CMD` becomes `["./docker-entrypoint.sh"]` (script
copied in stage 3, `chmod +x` at build time). Runs on every container
start, including `docker restart` — idempotent because TypeORM's
migration runner already tracks applied migrations in its own table and
no-ops on ones already run.

**Correction found during the Task 3 smoke test:** running
`migration:run` unconditionally against a genuinely empty Compose
Postgres failed immediately — `ALTER TABLE "posts" DROP COLUMN "image"`,
`relation "posts" does not exist`. Root cause: `src/common/database/database.module.ts`
sets `synchronize: configService.get('MODE') === 'DEV'`, and `.env`'s
actual default is `MODE=DEV`. The `migrations/` folder (6 migrations)
contains only *incremental* changes on top of a schema `synchronize`
already created during normal dev — there is no baseline/initial-schema
migration, so `migration:run` was never designed to bootstrap an empty
database. This is a pre-existing gap, unrelated to this pass's other
changes. Fix (confirmed with the user): make the entrypoint skip
`migration:run` when `MODE=DEV` and rely on `synchronize` instead, since
that's the quickstart's actual default configuration. **Known
limitation, explicitly out of scope for this pass:** self-hosting with
`MODE=PROD` (synchronize disabled) from a truly empty database still
isn't supported — that needs a proper baseline migration, a separate
follow-up.

**Correction found after merge, from live browser testing:** the app
booted and `index.html` loaded (200), but the browser showed a blank
page with every JS/CSS/font asset 403ing. Cause: `CorsMiddleware`
(`src/common/middlewares/cors.middlewares.ts`) is registered via
`app.use()` in `main.ts`, so it runs in front of `ServeStaticModule` too,
not just API routes. It whitelists exactly one `Origin` value —
`process.env.FRONT_DOMAIN` — and 403s anything else that carries an
`Origin` header. `.env`'s `FRONT_DOMAIN` (and `.env.example`'s default,
`https://crm.t-slen.com`) point at a different origin than where Compose
actually serves the app; browsers omit `Origin` on the top-level
navigation (why `index.html` loaded fine via `curl` and in-browser alike)
but send it on the module-script/font subresource requests that follow,
so those got rejected. Fixed by adding `FRONT_DOMAIN:
http://localhost:${APP_PORT:-4004}` to the `app` service's `environment:`
block in `docker-compose.yml`, alongside the existing `DB_*` overrides —
matches where the app is genuinely served from under Compose, and also
correctly fixes the links `task-notifications.service.ts` builds using
the same `FRONT_DOMAIN` value (its only other consumer). Verified with
`curl -H "Origin: http://localhost:4004" ...` returning 200 where it
previously 403'd.

### 4. Firebase boot stopgap

`src/common/services/firebase/firebase.module.ts`'s factory wraps the
`init()` call:

```typescript
providers: [
    {
        provide: FirebaseService,
        useFactory: async (configService: ConfigService) => {
            const firebaseService = new FirebaseService(configService);
            try {
                await firebaseService.init();
            } catch (err) {
                Logger.warn(
                    `Firebase not configured — uploads will fail until FIREBASE_SERVICE_ACCOUNT/FIREBASE_STORAGE_BUCKET are set: ${err.message}`,
                    'FirebaseModule'
                );
            }
            return firebaseService;
        },
        inject: [ConfigService],
    }
],
```

The app now boots with a placeholder/missing `FIREBASE_SERVICE_ACCOUNT`.
`FirebaseService.uploadImage` still throws if called with `this.storage`
unset (existing behavior of `admin.storage()` never having been called) —
that's the correct failure mode: upload endpoints error clearly at the
point of use instead of the whole app refusing to start. No change to
`FirebaseService` itself.

### 5. `.env.example` — no changes needed

Values already work as both bare-metal and Compose defaults; Compose
overrides `DB_HOST`/`LIVE_KIT_SERVER` itself (see §1). `LIVEKIT_API_KEY`/
`LIVEKIT_API_SECRET` already exist as placeholders and now double as the
dev-mode LiveKit server's own keys, so client and server agree without
new variables.

## Files touched

- New: `docker-compose.yml`
- New: `docker-entrypoint.sh`
- `Dockerfile` — stage 3: copy `migrations/` + `typeOrm.config.ts`, drop
  `--omit=dev`, copy + use `docker-entrypoint.sh` as `CMD`.
- `src/common/services/firebase/firebase.module.ts` — try/catch around
  `init()`.
- `packages/web/src/environments/environment.ts` — add `livekitUrl: ''`.
- `packages/web/.gitignore` — add `/src/environments/environment.prod.ts`.
- `packages/web/src/environments/environment.prod.ts` — untracked
  (`git rm --cached`, kept on disk with the real value, no longer
  committed).
- New: `packages/web/src/environments/environment.prod.ts.example` —
  checked-in template with `livekitUrl: ''`.
- `packages/web/src/app/pages/call/wellcome/call.component.ts` — read
  `LIVEKIT_URL` from `environment.livekitUrl` instead of a hardcoded
  literal.
- `README.md` — see below.

## README updates

Replace the current "Getting started" section's step 5 (bare `docker
build`/`docker run`) with a Compose-first quickstart, and keep the
existing Traefik/`start.sh` instructions as the documented production
path:

- New step: before Compose, note that `environment.prod.ts` must exist
  (`cp packages/web/src/environments/environment.prod.ts.example
  packages/web/src/environments/environment.prod.ts` — it's gitignored,
  same idea as `.env`), then "Or run the whole stack with Docker Compose
  (Postgres + LiveKit + app, no external accounts required to boot):
  `docker compose up`" with a note that Firebase/Google/Slack env vars
  can be left as placeholders for a first run — those integrations are
  optional and only needed for uploads/Calendar sync/Slack alerts
  respectively.
- Note that `environment.prod.ts`'s `livekitUrl` controls which LiveKit
  server video calls use: leave it `''` (the example's default) to use
  the Compose `livekit` service (falls back to `ws://localhost:7880/`
  when accessed via `localhost`), or point it at your own LiveKit
  server/Cloud project.
- Keep the existing `start.sh.example` + Traefik paragraph as-is, labeled
  as the production/public-HTTPS path, distinct from the Compose
  quickstart.
- Add a one-line note on migrations: Compose runs them automatically on
  container start; bare-metal dev still uses `npm run migration:run`
  manually as today.

## Testing

- New unit test for `FirebaseModule`'s factory: given a `ConfigService`
  stub whose `FIREBASE_SERVICE_ACCOUNT` points at a nonexistent file,
  assert the factory resolves (doesn't throw) and returns a
  `FirebaseService` instance. This is the regression test for the actual
  bug being fixed (app-wide boot failure on missing Firebase creds) —
  it would have failed before this change (factory promise rejects) and
  passes after.
- Manual verification (this repo's Docker/Compose behavior isn't
  something Jest exercises): `docker compose up` from a fresh clone with
  only placeholder Firebase/Google/Slack values in `.env`, confirm
  Postgres reports healthy, migrations apply, app responds on `:4004`,
  and `livekit` is reachable on `:7880`.
- Frontend: no existing spec file covers `call.component.ts`'s
  `configureUrls()`; adding one is out of scope (see below) — this pass
  is a like-for-like source-of-the-value swap (literal → `environment`
  field), not new logic, so it's covered by the manual verification
  above plus `ng build` completing cleanly.

## Out of Scope

- Local-disk `UploadAbstractService` implementation and making it the
  default storage backend — separate sub-project; this pass only stops
  Firebase's absence from blocking boot, it doesn't make uploads work
  without Firebase.
- Traefik/TLS/production domain setup inside Compose — stays on
  `start.sh.example`.
- Slimming the final image back down after dropping `--omit=dev` (e.g. a
  dedicated smaller migration step) — noted as a possible future
  optimization, not needed for this pass.
- Runtime-configuring `livekitUrl` via Compose env (e.g. templating it
  into the Angular build from `.env` at `docker compose build` time) —
  this pass makes it a plain editable build-time config value, matching
  how every other integration in this repo is configured; env-templating
  it is a possible future refinement, not needed now.
- Fixing `APPLICATION_SERVER_URL`'s equivalent hardcoded-default pattern
  in the same file (`call.component.ts:40`) — unused by anything this
  pass touches (it's dead: never assigned a truthy default, so its own
  `if (!APPLICATION_SERVER_URL)` fallback already runs), left alone.
- Adding a baseline/initial-schema migration so `migration:run` alone can
  bootstrap a truly empty database under `MODE=PROD` — pre-existing gap
  (see the Task 3 correction above), separate follow-up.
