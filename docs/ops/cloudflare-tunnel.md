# Hardening the production deployment with a Cloudflare Tunnel

This is an **optional** hardening layer for the Traefik-based production
deployment described in the main `README.md` (step 7). It puts the app
behind a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
so the origin server has **no public web ports at all** — inbound HTTP/S
traffic arrives only through Cloudflare's edge.

All values below are placeholders — substitute your own. Keep real
hostnames, IPs, tunnel IDs and tokens out of the repo (this file is tracked
and the repo is public).

## Why

With a normal "orange-cloud" Cloudflare setup, DNS proxies through
Cloudflare but the origin server still listens on public `:80`/`:443`.
Anyone who learns the origin IP can connect to it directly and **bypass**
Cloudflare's WAF, rate limiting and Access policies. A tunnel removes that
bypass: `cloudflared` runs on the origin and makes **outbound-only**
connections to Cloudflare, so the origin needs no inbound web ports and the
IP serves nothing.

```
Before:  visitor ──► Cloudflare edge ──► origin :443  (and attacker ──► origin :443 directly)
After:   visitor ──► Cloudflare edge ──► tunnel ──► cloudflared ──► traefik:443   (origin :443 closed)
```

## How it fits this stack

`cloudflared` runs as one more container joined to the same external
`tslen-net` Docker network as Traefik, Postgres and the app. It reaches
Traefik by its container name over Docker's internal DNS
(`https://traefik:443`) — exactly how Traefik already reaches the app
container — so **Traefik no longer needs to publish host ports**.

The tunnel is *remote-managed*: its configuration (which hostname maps to
which internal service) lives in the Cloudflare dashboard, and the
connector authenticates with a single token.

## Prerequisites — set up break-glass FIRST

Before you remove any public port, make sure you can still get into the box
if SSH or the tunnel ever breaks:

- Confirm your hoster's **out-of-band console / KVM** works (e.g. a VNC
  "web console"). Many require a **password** login, while your normal SSH
  user is key-only and has no password — so set one (`sudo passwd <user>`),
  store it in a password manager, and **actually test the console login**
  once. A console that needs a password you don't have is not a break-glass.
- Note that hoster web consoles often default to a non-US keyboard layout,
  which silently garbles passwords with symbols — test with a simple
  password first if a known-correct one is rejected.
- Keep a second SSH session open while making firewall/port changes.

## Steps

### 1. Create the tunnel and store its token

In the Cloudflare dashboard: **Zero Trust / Networks → Tunnels → Create a
tunnel → Cloudflared**, name it, and copy the connector **token**
(`eyJ...`). Put it in the server's gitignored `.env` (never commit it):

```bash
cd ~/<app-dir>
umask 077
printf 'CLOUDFLARE_TUNNEL_TOKEN=%s\n' 'eyJ...' >> .env
chmod 600 .env
```

### 2. Run the connector

Add a separate compose file (gitignored, same convention as the other prod
compose files) so it layers on without editing them:

```yaml
# docker-compose.cloudflared.yml
services:
  cloudflared:
    image: cloudflare/cloudflared:<current-version>   # pin a recent tag; the
    container_name: cloudflared                        # dashboard flags any
    restart: unless-stopped                            # build >1yr old as
    command: tunnel --no-autoupdate run                # unsupported
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN:?Set CLOUDFLARE_TUNNEL_TOKEN in .env}
    networks:
      - tslen-net

networks:
  tslen-net:
    external: true
```

```bash
docker compose -f docker-compose.cloudflared.yml up -d
docker logs cloudflared   # expect "Registered tunnel connection" x4
```

The tunnel should show **Healthy** in the dashboard. Nothing is sealed yet —
both the tunnel and the direct origin still work.

### 3. Route the public hostname through the tunnel

On the tunnel's **Routes → Add a route → Published application**:

- Hostname: `app.example.com`
- Service: `HTTPS` → `traefik:443`
- Additional settings → TLS → **Disable TLS certificate verification** (the
  `cloudflared → traefik` hop is internal to the Docker network; Traefik's
  cert is issued for the public hostname, not for the name `traefik`, so SNI
  verification would otherwise fail. Alternatively set **Origin Server Name**
  to the public hostname and leave verification on.)

### 4. Point DNS at the tunnel (easy to miss)

**The route alone does nothing** if DNS still points at the origin. In
**DNS → Records**, the hostname's record must target the tunnel, not an `A`
record to the origin IP:

- Correct: type **Tunnel** (a `CNAME` to `<TUNNEL_ID>.cfargotunnel.com`),
  Proxied.
- If it is still `A → <origin-ip>`, change it (editing a Published
  application usually offers to create/replace this for you).

Verify the site now loads through the tunnel while the origin is still open
(so you have a fallback): `curl -I https://app.example.com` → `200`.

### 5. Seal the origin — remove Traefik's host ports (not `ufw`!)

> **Gotcha:** Docker publishes container ports by writing its own iptables
> rules that **bypass `ufw`**. If Traefik publishes `80:80`/`443:443`, those
> ports are open to the internet regardless of `ufw` rules, so `ufw deny 443`
> does **not** close them. The `ufw` allow rules for 80/443 are cosmetic in
> that case.

Because the tunnel reaches Traefik internally, Traefik no longer needs to
publish host ports at all. Remove the `ports:` block from
`docker-compose.traefik.yml`:

```yaml
  traefik:
    # ...
    # ports:                 # <- delete; origin is sealed behind the tunnel.
    #   - '80:80'            #    cloudflared reaches traefik:443 over
    #   - '443:443'          #    tslen-net. Re-add to restore direct origin.
    networks:
      - tslen-net
```

```bash
cp docker-compose.traefik.yml docker-compose.traefik.yml.bak-$(date +%F-%H%M%S)
docker compose -f docker-compose.traefik.yml up -d   # brief web blip on recreate
```

Verify the seal:

```bash
# public path still works (via tunnel)
curl -s -o /dev/null -w '%{http_code}\n' https://app.example.com/            # 200
# direct origin now refused
curl -s -o /dev/null -w '%{http_code}\n' --resolve app.example.com:443:<origin-ip> https://app.example.com/   # 000
curl -s -o /dev/null -w '%{http_code}\n' http://<origin-ip>/                 # 000
```

Optionally delete the now-dead `ufw` allow rules for 80/443 (keep SSH):

```bash
sudo ufw delete allow 80/tcp && sudo ufw delete allow 443/tcp
```

## After sealing — things to know

- **Origin Let's Encrypt stops renewing.** Traefik's HTTP-01 challenge needs
  inbound `:80`, now closed, so the origin cert will eventually expire. With
  *Disable TLS certificate verification* on the tunnel this is harmless (the
  tunnel ignores origin cert validity); the public cert is Cloudflare's edge
  cert. To stop renewal-failure noise, retire the LE resolver in Traefik and
  serve a static/self-signed cert on `:443` internally.
- **The app sees Cloudflare's IP, not the visitor's.** Since only the tunnel
  reaches the app, per-IP logic (e.g. login rate limiting) must read the real
  client IP from `CF-Connecting-IP` / `X-Forwarded-For` instead of the socket
  address. Only trust these headers once the origin is sealed — before that
  they are spoofable.
- **SSH is a separate decision.** A tunnel for the *web* does not touch SSH.
  To also take SSH off the public internet you can restrict `:22` to known
  IPs in `ufw`, or route SSH through the tunnel behind Cloudflare Access. For
  SSH-over-tunnel from the `cloudflared` **container**, `localhost` is the
  container, not the host — add
  `extra_hosts: ["host.docker.internal:host-gateway"]` and point the route at
  `ssh://host.docker.internal:22`.

## Rolling back

Fully reversible, in increasing order of impact:

1. Re-add the `ports:` block to `docker-compose.traefik.yml` and recreate it —
   restores direct origin access.
2. Point the DNS record back to `A → <origin-ip>` (Proxied) — restores the
   non-tunnel path at the edge.
3. `docker compose -f docker-compose.cloudflared.yml down` — removes the
   connector entirely.
