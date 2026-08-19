# External Tasks API Design

> **Post-implementation correction:** `main.ts` applies a global route
> prefix (`app.setGlobalPrefix('/api/v' + API_VERSION)`, currently
> `/api/v1`) to every controller in the app - a fact missed while writing
> this spec. `@Controller('api/v1/tasks')` as designed below would have
> resolved to the real route `/api/v1/api/v1/tasks` (duplicated). The
> implemented controller uses `@Controller('external/tasks')` instead, so
> the actual route is **`/api/v1/external/tasks`**. Every `/api/v1/tasks`
> reference below should be read as `/api/v1/external/tasks`.

## Problem

Every task operation today goes through the internal `TasksGateway` WebSocket
(`create`/`update`/`multi-reordering`/`delete` events), used exclusively by
this repo's own Angular frontend over its own live socket connection. There
is no REST path for creating a task at all — only `GET /tasks` and
`GET /tasks/:id` exist as REST endpoints, and those require a normal
JWT login session.

External tools (a Slack bot, a CLI, a CI pipeline, Zapier, a personal
script — anything that isn't this app's own frontend) have no way to list or
create tasks. A Jira-style personal-access-token API closes that gap: a user
generates a long-lived token from their account, and external tools use it
to call a small, stable REST surface without needing to log in interactively
or hold a socket connection open.

## Non-goals

- No frontend UI for managing tokens in this pass — token issuance is
  backend-only (`POST`/`GET`/`DELETE /api-tokens`, called with a normal JWT
  session). A settings-page UI is a natural, separate follow-up.
- No changes to `TasksGateway` or the internal `/tasks` REST endpoints —
  this is purely additive.
- No dedicated response DTO for tasks — the API returns the same `Tasks`
  entity shape the internal endpoints already return.
- No task update/delete via this API yet — only list and create, per the
  request that started this ("fetch list of tasks, and create new with
  ability to assign phase"). Update/delete can follow the same pattern
  later.

## Architecture

Two new pieces, both additive:

1. **`ApiTokensModule`** (`src/resources/api-tokens/`) — issues, lists, and
   revokes personal access tokens for the currently logged-in user (normal
   JWT auth, no new auth mechanism needed for this part).
2. **`ExternalTasksModule`** (`src/resources/external-tasks/`) — exposes
   `GET /api/v1/tasks` and `POST /api/v1/tasks`, protected by a new
   `ApiTokenGuard`, delegating all actual persistence to the existing
   `TasksService`/`TasksRepository` (no duplicated business logic).

```
External caller
   │  Authorization: Bearer <api-token>
   ▼
ApiTokenGuard ──(hash lookup)──▶ ApiToken row ──▶ Users row ──▶ request.user
   │
   ▼
ExternalTasksController (/api/v1/tasks)
   │
   ▼
TasksService (existing, unchanged)
```

## Data model

New entity `ApiToken`:

| Column | Type | Notes |
|---|---|---|
| `id` | int, PK | |
| `token` | varchar(64) | SHA-256 hex digest of the token, **never plaintext** |
| `userId` | int, FK → `users.id` | owner; `ManyToOne(() => Users)`, `onDelete: CASCADE` |
| `name` | varchar(250) | user-supplied label, e.g. "Zapier integration" |
| `createdAt` | timestamp | |
| `lastUsedAt` | timestamp, nullable | updated on each successful auth |

Plaintext token format: `crypto.randomBytes(32).toString('hex')` (64 hex
chars). Only ever returned once, in the `POST /api-tokens` response body.
Revocation is a hard delete of the row (matches GitHub/Jira PAT UX — no
separate `revokedAt` soft-delete state needed for v1).

Migration: `migrations/add-api-tokens-table/`, following this repo's
existing migration folder convention (see `migrations/add-task-comments-table/`
for the pattern).

## API Tokens endpoints (`/api-tokens`, JWT auth, unchanged existing guard)

### `POST /api-tokens`
Request: `{ name: string }`
Response: `{ id, name, token, createdAt }` — `token` is plaintext, shown
this one time only. Generates the random token, stores its SHA-256 hash.

### `GET /api-tokens`
Response: `{ id, name, createdAt, lastUsedAt }[]` — the caller's own tokens
only (filtered by `userId` from the JWT). Never includes the token value.

### `DELETE /api-tokens/:id`
Deletes the token row. 404 if it doesn't exist or isn't owned by the caller
(no leaking existence of other users' token IDs).

## ApiTokenGuard

New guard (`src/resources/api-tokens/guards/api-token.guard.ts`), applied
only to `ExternalTasksController` (via `@UseGuards(ApiTokenGuard)`), not
registered globally — the existing `AuthGuard`/`RolesGuard` global guards
are untouched.

```
extractTokenFromHeader(request) -> Bearer <token>
sha256(token) -> hash
find ApiToken by hash, join Users
  not found -> 401 Unauthorized
found -> request.user = apiToken.user (same shape @User() already expects)
         fire-and-forget update lastUsedAt (don't block the request on it)
```

Because `request.user` ends up being a real `Users` row either way, every
existing service method that takes a `Users` param (`TasksService`,
`UsersService.validateUserIdByRole`, etc.) works completely unchanged
whether the caller came in via session JWT or an API token.

## External Tasks endpoints (`/api/v1/tasks`, `ApiTokenGuard`)

Route prefix `/api/v1` deliberately separates this from the internal
`/tasks` surface — different guard, different (much smaller) request DTO,
free to version independently later.

### `GET /api/v1/tasks?projectId=&phaseId=&status=`
All three query params optional (`ParseIntPipe` + `optional: true` for the
numeric ones). No params = same "everything" behavior `GET /tasks`
already has internally (`TasksService.findAll` has no per-user scoping
today; this API doesn't add or remove that). Filters combine as an AND in
a `where` clause added directly in `TasksRepository` (a new
`findAllFiltered` method, following the existing `getByRole`-style
override pattern `BaseAbstractService.findAll` already dispatches to).

### `POST /api/v1/tasks`
Request DTO `CreateExternalTaskDto`:
```ts
{
  title: string;          // required, @IsString() @IsNotEmpty()
  description?: string;
  phaseId: number;         // required, @IsInt()
  priority?: string;
  assigneeEmail?: string;
}
```
Deliberately much smaller than the internal `CreateTaskDto` (which carries
nested `phases`/`project`/`orderInPhases`/`taskUserAssignmentRelations`
objects shaped for the drag-and-drop board — not a contract external tools
should have to know about).

Flow:
1. Look up `TaskPhase` by `phaseId` (via existing `TaskPhaseRepository`/
   service) — 404 if it doesn't exist.
2. Derive `projectId` from `phase.taskProject.id` server-side. The request
   never supplies `projectId` directly, so there's no way to send a
   `phaseId`/`projectId` pair that contradict each other.
3. Set `createdBy`/`createdByName` from `request.user` (the token owner) —
   never trusted from the request body.
4. Call `TasksService.create(...)` (existing method, unchanged) with a
   `CreateTaskDto`-shaped object assembled from the above.
5. Return the created `Tasks` entity (same shape `GET /tasks/:id` already
   returns).

## Testing

Following this repo's TDD convention (`superpowers:test-driven-development`,
per `AGENTS.md`) — real failing test before each implementation step, no
mocking the unit under test:

- `ApiTokensService` unit tests: token generation produces a 64-char hex
  string, hash stored not plaintext, `GET` never returns plaintext,
  `DELETE` 404s for another user's token id.
- `ApiTokenGuard` unit tests: valid hash → `request.user` set correctly;
  unknown/missing token → 401; `lastUsedAt` gets updated.
- `ExternalTasksController`/`ExternalTasksService` unit tests: filters
  combine correctly in the repository query; `POST` derives `projectId`
  from `phaseId` and ignores any client-supplied `projectId`; unknown
  `phaseId` → 404; `createdBy` always comes from `request.user`, never
  the body.
- Full backend suite + `nest build` green before merge, matching this
  session's established verification pattern.

## Self-review

- **Placeholder scan:** no TBD/TODO — every endpoint's request/response
  shape, validation, and error case is written out concretely above.
- **Internal consistency:** `ApiTokenGuard` setting `request.user` to a
  real `Users` row is the load-bearing decision that keeps every
  downstream consumer (`@User()`, `TasksService`, etc.) unchanged — checked
  against `src/resources/auth/guards/auth.guard.ts`'s existing
  `request['user'] = payload.user` pattern, which does the same thing.
- **Scope check:** single cohesive slice (tokens + list/create) with clear
  non-goals; not decomposed further.
- **Ambiguity check:** "assign phase" was read as "the created task's
  `phaseId`, with `projectId` derived from it" rather than a separate
  explicit `projectId` field — confirmed against the existing data model
  where a phase belongs to exactly one project, so this is the only
  internally-consistent reading.
