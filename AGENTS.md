# AGENTS.md

Workflow rules for anyone (human or AI agent) working in this repo. This
file is the source of truth for repo-specific conventions; `CLAUDE.md`
just points here.

See `README.md` for the product/feature overview and tech stack.

## Repo layout

- `src/` — NestJS backend (TypeORM + PostgreSQL, WebSockets).
- `packages/web/` — Angular 22 frontend, its own `package.json`.
- `test/` — backend Jest tests (`unit/`, `integration/`).
- Frontend tests live next to the file they cover (`*.spec.ts`), run via Jest.

Two separate npm projects: `npm install` at repo root **and** inside
`packages/web/` are both required.

## Environment

- Backend requires **Node >= 24** (see `engines` in `package.json`,
  `.nvmrc` pins `24.19.0` — this also matches the Node version CI uses).
  The default shell `node` on this machine may be older — check with
  `node -v` first. If it's not 24.x:
  ```bash
  export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 24.19.0
  ```
  Running tests/build under an old Node version fails with cryptic
  `ERR_UNKNOWN_BUILTIN_MODULE` errors from `npx jest` — that's the tell.

## CI

`.github/workflows/main-ci.yml` runs on every push/PR against `main`:
backend lint + e2e + unit tests (repo root), and Angular lint
(`packages/web`, `npm run lint` → `ng lint`) as a separate job. The
frontend lint job only fails on **new** violations — `ng lint` applies
`packages/web/eslint-suppressions.json`, a snapshot of the pre-existing
backlog taken when the lint setup was fixed, so it doesn't block PRs on
old, unrelated violations. Regenerate that file (from `packages/web/`,
via `./node_modules/.bin/eslint "src/**/*.ts" "src/**/*.html"
--suppress-all`) if you clear out a rule's suppressed violations in a
file you're touching.

## Task tracking

Track significant feature/architectural work (not small bug fixes) as a
task in the production Workhub instance itself
(`https://<your-workhub-instance>`), created via its own external API —
not by hand through the UI.
- Endpoint: `POST {baseUrl}/api/v{API_VERSION}/external/tasks` (see
  `src/resources/external-tasks/`). Auth: `Authorization: Bearer
  <api-token>`, where the token is minted via `POST /api-tokens` while
  logged in (see `src/resources/api-tokens/`).
- Required body field: `title`, `phaseId` (the Kanban column to file
  into). Resolve it via `GET /api/v{API_VERSION}/external/projects`
  (same auth), which returns each project with its nested
  `phases: [{id, name}]` — match the phase by name (e.g. "In progress")
  under the target project. **Don't infer `phaseId` from the numeric id
  in a `tasks-list/<id>` UI URL** — that id is the *project* id, not a
  phase id (confirmed: task 413 files under project 10 "T-slen Workhub",
  phase 22 "In progress" — the two ids are unrelated numbers).
- Never guess the API token or `phaseId` against production — ask the
  user for the token, and either ask which phase or resolve it via the
  `external/projects` lookup above, before calling this endpoint.
- **Link the task from the commit(s) that do the work**: once a task
  exists for the work, append a footer line `Task: <task URL>` to the
  relevant commit message(s) (after a blank line, like any other
  trailer) — e.g. `Task: https://<your-workhub-instance>/pages/tasks-list/10;title=T-slen%2520Workhub;task=413`.
  Skip it only when no task exists yet for that work.

## Git workflow

- **Conventional Commits** for every commit message: `<type>(<scope>): <description>`
  (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `style`, `revert`).
  Imperative mood, no trailing period, subject under ~72 chars. Use `!` or
  a `BREAKING CHANGE:` footer for breaking changes. Scope = the affected
  module/directory when it's not obvious (`chat`, `google-calendar`, `web`, ...).
- **No Jira integration for this repo** — do not prefix commits or branches
  with a ticket key, and don't query Jira to pick work here. (This overrides
  any global Jira-based commit/branch convention for this repo specifically.)
- Branch naming: `<type>/<short-slug>` where `<type>` mirrors the commit
  type family (`feature/`, `bugfix/`, `chore/`, ...), e.g.
  `bugfix/fix-chat-duplicate-messages`.
- **No `Co-Authored-By: Claude` trailer** on commits in this repo — leave
  it off regardless of the default commit-message template.

## Testing — required for new features and bug fixes

Every new feature and every bug fix needs a test that would have failed
before the change (TDD red/green). Don't hand-wave "manually verified" for
things a test can cover — see `superpowers:test-driven-development` and
`superpowers:systematic-debugging` skills for the full process.

**Backend (Jest, from repo root, after `nvm use 24.19.0`):**
```bash
npm run test:unit   # unit tests only, --config test/jest-unit.json, matches *.unit.spec.ts
npm run test:e2e    # integration tests, --config test/jest-e2e.json
npm test            # everything, --config test/jest.json
```
Repository-layer logic that touches TypeORM (`EntityManager.transaction`,
`find`, `save`) can be unit-tested without a real DB by handing the
repository a small fake `EntityManager` that applies the same `where`
clause shape (see `test/unit/resources/google-calendar/google-calendar.repository.unit.spec.ts`
for the pattern) — no need to spin up Postgres for that.

**Frontend (Jest + jest-preset-angular, from `packages/web/`):**
```bash
npm test   # jest — headless (jsdom), no browser, runs once and exits
```
Spec files are still written against Jasmine's API (`jasmine.createSpyObj`,
`spyOn(obj, 'method').and.returnValue(...)`, `.calls.mostRecent()`, etc.) —
that's intentional, not a migration leftover to clean up. `@types/jest`
ships most of that ambient `jasmine` typing itself (Jest carries a copy of
Jasmine's types for back-compat); `src/test-setup/jasmine-compat.ts` fills
the small remaining gap (`resolveTo`/`rejectWith`, `SpyObj<T>`,
`spyOnProperty`, `toBeTrue`/`toBeFalse`) with real `jest.fn()`/`jest.spyOn()`
underneath, and `src/test-setup/setup-jest.ts` also stubs jsdom's
`HTMLMediaElement.play()` (jsdom's is a `Promise`-less "not implemented"
stub, unlike a real browser — code doing `new Audio(...).play().catch(...)`
throws synchronously without this). Extend `jasmine-compat.ts` rather than
rewriting a spec file to native `jest.fn()`/`jest.spyOn()` unless you're
touching that spec anyway.
To run a single component's specs in isolation without booting the whole
app's DI graph, mock the service dependencies directly (`jasmine.createSpyObj`)
rather than pulling in the real providers — see `chat.service.spec.ts` /
`chat.component.spec.ts` for the pattern.

## Angular conventions

- **Use Signals**, not RxJS `Subject`/`BehaviorSubject`, for component
  state and inputs: `input()`, `signal()`, `computed()`, `effect()`.
  Existing RxJS `Subject`-based services (e.g. `ChatService`) are legacy —
  don't copy that pattern into new code; new services exposing reactive
  state should expose signals.
- **Migrate old-style `@Input()` to signal `input()` whenever you touch
  it.** If a change requires editing a component that still declares
  `@Input()` (a plain property or, especially, the older `set setXxx(data)`
  setter idiom used to react to input changes pre-signals), convert that
  component's inputs to `input()` as part of the same change rather than
  adding to/around the old style — don't leave the file half-migrated.
  Drop the `setXxx` naming convention (the signal itself replaces the
  setter's job); any imperative side effect that used to live in the
  setter body moves into an `effect()` in the constructor (effects run
  after inputs are bound, unlike constructor code — see the gotcha below).
  Every template that binds into the renamed inputs needs its attribute
  names updated to match. See `ag-grid-table.component.ts`'s migration
  (columnDefs/rowData/components/sizeColumnsToFit/headerHeight/rowHeight/
  tableId, plus its 7 consumers) as the worked example.
- Standalone components (no `NgModule` declarations) — match the existing
  style under `packages/web/src/app/pages/` and `tslen-components/`.
- **Loading state: scope it to the button/card that triggered the
  request, not the whole page.** `LoadingLogoComponent`
  (`helpers/loading-logo/`) takes `isLoading`/`bar` as signal inputs —
  default (`bar()` false) renders a dimmed, click-blocking `position:
  absolute` overlay scoped to its parent's `.loading-div` wrapper, for
  local per-card/page loading. `LoadingButtonComponent`
  (`helpers/loading-button/`) is the reusable button-level spinner
  (`[disabled]` stays on the real `<button>`, it only swaps content for a
  `mat-spinner` without changing the button's width). The global
  `LoaderService`/`LoaderInterceptor` fallback
  (`admin.component.html`'s single `[bar]="true"` instance) renders a
  thin, non-blocking top progress bar instead — `pointer-events: none`,
  so the nav bar and the rest of the app stay usable during a long
  global load. `[bar]="true"` is reserved for that one page-wide
  fallback; new features should default to local loading state
  (`bar()` false), not lean on the global request counter. See
  `docs/superpowers/specs/2026-08-18-scoped-loading-indicators-design.md`
  for the full rationale.
- **Gotcha:** signal `input()` values are **not** set yet inside the
  constructor — Angular applies input bindings *after* the constructor
  runs, before `ngOnInit`. Don't read `input()` values in the constructor
  expecting the real bound value; use `ngOnInit()` or an `effect()` (which
  runs after inputs are applied) instead.
- **Gotcha:** a singleton (`providedIn: 'root'`) service that opens an
  external connection (WebSocket, SSE, etc.) must tear down the previous
  connection before opening a new one, or repeated calls (room switches,
  remounts) silently leak duplicate live connections that each deliver
  every event once — see the fix in `chat.service.ts`'s `listenForEvents`.

## Backend conventions

- When syncing/deduping against an external system (e.g. Google Calendar),
  match existing rows by the external system's **stable ID**
  (`googleId`, etc.), never by a time-window filter on a mutable field —
  a time window can drift a legitimate row out of view and cause a
  duplicate insert on the next sync. See `google-calendar.repository.ts`.
- Parse external date/time strings with their offset intact
  (`new Date(isoStringWithOffset)`); stripping the offset before parsing
  makes `Date` interpret it as server-local time, corrupting the instant.
