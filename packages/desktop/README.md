# @tslen-workhub/desktop

An Electron shell that wraps this app's web frontend in a native macOS
window — the same pattern Mattermost/Rocket.Chat's desktop clients use.
It does **not** bundle a build of `packages/web`: it just loads whatever
server URL you point it at, so one build works for every self-hosted
deployment instead of baking in one organization's backend.

## What it does (v1: bare shell)

- First launch asks for your server's URL (e.g. `https://crm.example.com`)
  and saves it to a local config file (`app.getPath('userData')/config.json`).
- Every launch after that loads your saved server directly.
- A "Change Server…" item under the app menu lets you point it at a
  different server later.
- Standard macOS app menu (Cmd+Q, Cmd+C/V, etc. all work).
- Remembers window size/position between launches.
- External links (e.g. the Google OAuth Calendar-sync flow) open in your
  real browser instead of inside the app window.

Not included yet: native notifications, a dock unread-count badge, and
auto-updates. None of these are hard to add later, they're just out of
scope for this first pass.

## Running it locally

From the repo root:

```bash
npm install
npm run start --workspace=packages/desktop
```

Or from this directory: `npm start` (builds via `tsc`, then launches
`electron .`).

## Building a macOS app

```bash
npm run dist:mac --workspace=packages/desktop
```

Produces an unsigned `.dmg`/`.zip` under `packages/desktop/release/`.
**Unsigned** means macOS Gatekeeper will refuse to open it if it was
downloaded from the internet (quarantine flag) - right-click → Open past
that warning, or (for a build you made yourself, running locally) there's
usually no quarantine flag at all. Code signing and notarization (an Apple
Developer ID, $99/yr) are deferred until this needs to be handed out to
people who aren't building it themselves - add `mac.identity` and
`afterSign` notarization config to this package's `package.json` `build`
key when that's ready; nothing else needs to change.

## Troubleshooting: white screen after entering a server URL

This almost always means the shell loaded fine but every API call the app
then made failed. Open View → Toggle Developer Tools (already wired into
the app menu) and check the Console/Network tabs for the actual error
before guessing further.

The most common cause when pointing this at a **local** backend
(`http://localhost:4004`) instead of a real deployment: `packages/web/dist`
was built with `ng build --configuration production`, which always
hardcodes `protocol: 'https://'` in `environment.prod.ts`
(`packages/web/set-env.ts` - correct for a real deployment behind Traefik,
since that's what terminates TLS there). Loading that build against a
plain-HTTP local backend makes every API request go out as `https://`,
which fails outright. Fix: rebuild without the production flag so it uses
`environment.ts` instead (already `http://` + whatever `BACKEND_DOMAIN` is
in your root `.env`):

```bash
cd packages/web && npx ng build
```

No need to restart the backend - `ServeStaticModule` reads `packages/web/dist`
from disk per request. Just reload the Electron window (Cmd+R) or relaunch.

## Tests

`npm test --workspace=packages/desktop` - covers `config-store.ts`'s
read/write/fallback logic. `main.ts` itself is thin Electron API wiring
(BrowserWindow/Menu/ipcMain) with no independently-meaningful logic to
unit test; exercising it would need an Electron-launching integration
tool (e.g. Playwright's Electron support), which isn't set up in this
repo yet.
