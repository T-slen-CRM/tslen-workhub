# Audit log: change tracking + admin viewer design

## Problem

The v1 audit log (`docs/superpowers/specs/2026-08-23-audit-log-design.md`)
records *that* a mutation happened (who, IP, route, status, raw sanitized
request body) but not *what actually changed* — the request body is what
was submitted, not a before/after comparison, and it's only captured for
REST endpoints. There's also no way to view any of this without querying
the database directly.

This design adds:
1. Field-level, human-readable change tracking ("assignee: Oleh Teslenko
   → John Smith") for any entity mutation, regardless of whether it came
   through a REST endpoint or a WebSocket gateway.
2. An admin-only page in the frontend to browse it, reusing the existing
   ag-grid table pattern from the Inventory page.

## Scope

- **Diff tracking is generic across every entity**, not special-cased per
  resource — one mechanism, not per-service code.
- **Both REST and WebSocket-driven mutations are covered.** This matters
  concretely: Task mutations (the headline example — assignee changes)
  happen entirely over the `tasks` WebSocket gateway in this app, not
  REST, so WS coverage is required for this feature to do anything
  useful for its main use case.
- **Admin-only** viewer — managers, who can already see the existing
  `/admin` section, must NOT see this page.
- Out of scope for this iteration: filtering/search UI (ag-grid's
  built-in client-side sort/filter over the fetched window covers this
  for free), pagination controls (client-side via ag-grid, same as
  Inventory), extending WS capture to gateways other than `TasksGateway`
  (no other gateway has mutating handlers today), retention/archival.

## Architecture

```
HTTP mutation                          WS "tasks" message
      |                                        |
      v                                        v
AuditLogMiddleware                    AuditLogWsInterceptor
  AuditContextStorage.run(            AuditContextStorage.run(
    {changes: []}, () => next())        {changes: []}, () => next.handle())
      |                                        |
      |   (downstream: controller/gateway handler calls a service,
      |    which calls repository.save()/insert()/remove() ...)
      |                                        |
      v                                        v
        AuditLogSubscriber (global TypeORM subscriber)
        beforeUpdate / afterInsert / beforeRemove
          - diff event.entity vs event.databaseEntity
          - AuditContextStorage.getStore()?.changes.push(diff)
      |                                        |
      v                                        v
  res.on('finish'): read store.changes   handler completion: read
  + userId/ip/route/status               store.changes + socket user/ip
      |                                        |
      +--------------------+-------------------+
                            v
              AuditLogBufferService.enqueue()
              (unchanged from v1: capped buffer,
               batched flush every 60s)
                            |
                            v
                     audit_logs table
                            |
                            v
              GET /api/v1/audit-log (admin-only)
                            |
                            v
              Angular admin/audit-log page (ag-grid)
```

Everything downstream of `AuditLogBufferService` is unchanged from v1.
What's new is everything upstream of it: two context-opening entry
points (one per transport) and a subscriber that both feed into.

### 1. `AuditContextStorage` (`src/common/audit-context.storage.ts`)

A single `AsyncLocalStorage<{ changes: EntityChange[] }>` instance
(Node built-in — `node:async_hooks` — no new dependency). Whoever starts
a trackable operation (the HTTP middleware, the WS interceptor) opens a
context around it with `AsyncLocalStorage.run({changes: []}, () => ...)`.
Anything that runs *inside* that call stack — including async work
several layers down through services/repositories — can read the same
store via `.getStore()`. Outside of an open context (cron jobs, app
bootstrap, TypeORM migrations), `.getStore()` returns `undefined`, and
the subscriber silently skips tracking — exactly right, since only
user-triggered operations should be audited, not internal housekeeping.

### 2. `AuditLogSubscriber` (`src/resources/audit-log/audit-log.subscriber.ts`)

`@EventSubscriber() implements EntitySubscriberInterface` with no
`listenTo()` override, so it receives events for every entity. Hooks:

- `beforeUpdate(event: UpdateEvent<any>)`: TypeORM populates
  `event.databaseEntity` (the current DB row) and `event.entity` (the
  incoming values) for update events triggered via `.save()` — comparing
  them field-by-field yields exactly what changed. Only fields present
  on `event.entity` are compared (unset fields weren't part of the
  update).
- `afterInsert(event: InsertEvent<any>)`: the whole sanitized new row,
  recorded as `action: 'insert'`.
- `beforeRemove(event: RemoveEvent<any>)`: the whole sanitized
  soon-to-be-deleted row, recorded as `action: 'delete'`.

Each hook, if `AuditContextStorage.getStore()` is active, pushes:
```ts
{ entityName: string, entityId: number | string, action: 'insert'|'update'|'delete',
  fields: { field: string, from?: unknown, fromLabel?: string, to?: unknown, toLabel?: string }[] }
```
onto `store.changes`. Sensitive field names (same deny-list as request-
body sanitization: password/token/secret/apiKey, case-insensitive) are
**excluded from `fields` entirely** — not redacted-in-place, omitted, so
even "this field changed" isn't observable for a password column.

The whole hook body is wrapped in try/catch that only logs on failure —
a bug in diff capture must never be able to fail or corrupt the actual
database write it's observing.

**Label resolution** happens here, at write time, via a small, explicit,
centralized map (`src/resources/audit-log/audit-log-field-resolvers.ts`)
from field name to an async resolver, e.g.:
```ts
{
  userId: (id) => usersRepository.findOne(id).then(u => u ? `${u.firstName} ${u.lastName}` : null),
  phaseId: (id) => taskPhaseRepository.findOne(id).then(p => p?.name ?? null),
  projectId: (id) => taskProjectRepository.findOne(id).then(p => p?.name ?? null),
}
```
A field with no configured resolver just carries its raw value with no
`fromLabel`/`toLabel`. Resolving at write time (not display time) means
a label reflects what was true *then*, even if that user/phase is later
renamed or deleted — this is deliberate: an audit trail should describe
history accurately, not reinterpret it through the present state.

**Relation-pair collapsing**: a small, explicit, non-generic rule (not
a mechanism that generalizes automatically) scoped to known
assignment-style relation entities — currently just
`TaskUserAssignmentRelation`. After the subscriber finishes populating
`store.changes` for an operation, a collapsing pass looks for a
delete+insert pair on that entity sharing the same parent id
(`taskId`) and merges them into one synthetic field change on the
parent entity: `{field: 'assignee', from: 'Oleh Teslenko', to: 'John
Smith'}` (insert-only → `from: null` = new assignment; delete-only →
`to: null` = unassigned). Extending this to another many-to-many
relation later means adding one more entry to this rule set, not
building new infrastructure.

**Bounding**: a single operation touching many rows (e.g.
`TasksService.multiReordering` across many tasks) produces one
`audit_logs` row with a longer `changes` array, not one row per touched
entity — so it can't multiply write count, only payload size. `changes`
is capped at 200 entity-changes per operation; beyond that, a
`{truncated: true, additionalChanges: N}` marker replaces the rest —
mirroring the existing request-body truncation approach.

### 3. Capture entry points

**HTTP** (`AuditLogMiddleware`, modified): wraps the existing
`next()` call in `AuditContextStorage.run({changes: []}, () => next())`.
The existing `res.on('finish')` handler — already reading
userId/ip/method/route/status — now also reads
`AuditContextStorage.getStore()?.changes` and attaches it as the new
`changes` field, and derives `resourceType`/`resourceId` from the first
non-relation entity in `changes` when present, falling back to the
existing route-based derivation when it's empty (e.g. a failed login
has no entity change at all).

**WebSocket** (`AuditLogWsInterceptor`, new,
`src/common/interceptors/audit-log-ws.interceptor.ts`): a
`NestInterceptor` applied to `TasksGateway`. `intercept()` gets the
socket via `context.switchToWs().getClient()` (its authenticated `user`,
set the same way `AuthGuard` sets it for HTTP, and `handshake.address`
for IP), opens `AuditContextStorage.run({changes: []}, () =>
next.handle())` around the handler's `Observable`, and via RxJS
`tap()`/`catchError()` on completion builds an entry — `method: 'WS'`,
`route: <event name, e.g. "tasks:update">`, `statusCode: 200` on
success or a captured error indicator on failure — and hands it to the
**existing, unchanged** `AuditLogBufferService.enqueue()`.

## Data model

```
audit_logs                    (existing columns from v1 unchanged, plus:)
  changes      jsonb, nullable   -- array of entity-level diffs, see above
  method       varchar           -- now also 'WS' alongside POST/PUT/PATCH/DELETE
```

No new indexes needed — `changes` is read in full per row, not queried
into.

## Backend read API

New endpoint: `GET /api/v1/audit-log`, in a new `AuditLogController`
added to `AuditLogModule`. Guarded by the existing `RolesGuard` with
`@Roles(Role.Admin)` — admin-only, managers excluded (this is *stricter*
than the general `/admin` section, which already allows managers).
Returns rows from at most the last 30 days, capped at 1000 rows
(whichever limit is reached first), ordered by `createdAt` descending —
no query params/filtering in v1. This bounded window matters here specifically because, unlike
Inventory (which grows only as fast as physical items are added),
`audit_logs` grows continuously with every mutation — an unbounded
`SELECT *` would eventually become a real problem even though
Inventory's identical unbounded-fetch pattern is fine for its slower
growth rate.

## Frontend

New `packages/web/src/app/admin/audit-log/` directory, mirroring
`admin/inventory/`'s structure exactly:
- `audit-log.component.ts/html/scss` — standalone component, fetches
  once via the new service, binds to `AgGridTableComponent` exactly like
  Inventory (`[columnDefs]`, `[rowData]="rowData | async"`,
  `[components]`, `[sizeColumnsToFit]="true"`).
- `services/audit-log.service.ts` — `@Injectable({providedIn: 'root'})`,
  delegates to the existing `DataService.getObservableData('/audit-log')`.
- `interfaces/audit-log.ts` — the row shape (mirrors the backend
  `AuditLog` entity + `changes` array shape above).
- A custom cell renderer (same pattern as `InventoryRenderComponent`)
  turning a row's `changes[]` into readable lines in the "Changes"
  column, e.g.:
  ```
  phaseId: ToDo → In progress
  assignee: Oleh Teslenko → John Smith
  ```

**Route**: registered in `admin-routing.module.ts` with its own
`data: { roles: ['admin'] }, canActivate: [RoleGuard]` — the parent
`/admin` route already allows `admin`+`manager`, so this route needs
the stricter check attached directly to it (`RoleGuard` reads
`route.data.roles` from whichever route it's attached to).

**Nav**: a new nav-group in `navigation.ts` with only `admin: true` (no
`manager: true`), following the existing group-level gating already in
`nav-content.component.html`
(`*ngIf="item.type=='group' && item[role]"`) — the existing `admin`
nav group can't be reused as-is since it grants `manager: true` too.

## Error handling & resilience

- Subscriber hooks: try/catch around every hook body, log-only on
  failure, never propagate — a diff-capture bug must never break the
  real database write it's observing.
- `changes` array capped at 200 entries per operation (see Bounding
  above) — preserves the v1 design's core property that DB write cost
  per audit-log row stays bounded regardless of how large the
  originating operation is.
- WS interceptor: errors from the wrapped handler are still captured
  (as a failed-operation entry) and re-thrown unchanged to the gateway's
  normal error handling — auditing must be transparent to the actual
  WS contract.
- Everything from `AuditLogBufferService` downward is the existing v1
  machinery: capacity-capped buffer, batched flush, flush errors caught
  and logged, never thrown into a request/message path.

## Testing

**Backend** (unit, no DB needed for any of these):
- Diff computation (`event.entity` vs `event.databaseEntity` → field
  diff, sensitive-field exclusion) as a pure function.
- Label resolution (mocked repositories).
- Relation-pair collapsing (insert-only, delete-only, matched pair
  cases).
- `AuditLogSubscriber` hooks: mocked TypeORM events, both with an
  active `AuditContextStorage` context (via `AsyncLocalStorage.run()`
  in the test) and without one (no-op case).
- `AuditLogWsInterceptor`: mocked `ExecutionContext.switchToWs()`,
  success and error paths.
- Extend the existing `AuditLogMiddleware` spec
  (`test/unit/common/middlewares/audit-log.middleware.unit.spec.ts`)
  to cover the new `AuditContextStorage` wrapping and `changes`
  attachment.
- `AuditLogController` / read-service: admin-only guard behavior
  (reusing the already-tested `RolesGuard` pattern) plus the
  bounded-window query behavior.

**Frontend**: unit test for the custom "changes" cell renderer (the one
piece of real logic — turning `changes[]` into readable lines), with
mocked service dependencies per this repo's existing pattern
(`chat.service.spec.ts`/`chat.component.spec.ts`). The route guard
itself reuses the already-covered `RoleGuard`; manually verifying a
manager account can't reach `/admin/audit-log` is reasonable manual QA
rather than new e2e infra (none exists for the frontend today).

## Future extensions (explicitly not this iteration)

- Filtering/date-range/search UI beyond ag-grid's built-in client-side
  column filters.
- Server-side pagination (currently bounded-window + client-side, same
  as Inventory).
- Extending WS capture to other gateways if they gain mutating handlers.
- Retention/archival for `audit_logs` generally (carried over from the
  v1 spec, still unaddressed).
