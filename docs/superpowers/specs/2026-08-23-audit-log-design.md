# Audit / history log design

## Problem

There is currently no record of who did what on the platform. We want a
history log of user actions — including the requester's IP — written to
the database, so abuse, mistakes, and "who changed this" questions can be
answered after the fact.

## Scope (v1)

- **What's logged:** all REST mutation requests (`POST`/`PUT`/`PATCH`/`DELETE`)
  across every controller, captured generically — not a hand-picked list
  of business events. `GET`/`HEAD`/`OPTIONS` are never logged.
- **Outcomes logged:** every outcome, not just successes — 2xx, 4xx
  (validation errors, 401/403 guard rejections), and 5xx. This is what
  makes the log useful for security review (e.g. repeated failed logins
  from one IP), not just an activity feed.
- **Out of scope for v1:**
  - WebSocket-originated actions (chat messages, `tasks` gateway
    create/update/delete/reorder events, live-kit events). Task
    mutations in this app currently go through the `tasks` WS gateway,
    not REST — those are *not* covered by this design. Follow-up once
    this REST-only version is proven.
  - Any admin UI / query endpoint to browse the log. Rows just need to
    exist in Postgres for now; querying is a follow-up.
  - Retention/archival policy.

## Architecture

Three new pieces, no new infrastructure (no Redis, no message broker):

```
Request (POST/PUT/PATCH/DELETE)
        |
        v
AuditLogMiddleware (global, common/middlewares/)
  - early-return for GET/HEAD/OPTIONS
  - attaches res.on('finish') listener
        |
        v  (fires after response is sent, whatever the outcome)
  reads: req.user (set by guard, may be null), IP, method,
         matched route, params, sanitized+truncated body,
         final res.statusCode
        |
        v
AuditLogBufferService.enqueue(entry)   -- O(1), never awaited, never blocks
  - bounded in-memory array (capacity-capped)
        |
        v  (every ~2s, via @Interval())
  batched repository.insert([...])  -->  audit_logs table (Postgres)
```

### 1. `AuditLogMiddleware` (`src/common/middlewares/audit-log.middleware.ts`)

Registered globally via `NestModule.configure()` → `consumer.apply(AuditLogMiddleware).forRoutes('*')`, the same mechanism already used for `CorsMiddleware`.

Why middleware and not a global interceptor (like the existing
`TimeoutInterceptor`): Nest's request pipeline is
`Middleware → Guards → Interceptors → Pipes → Handler`. A guard
rejection (401 from the global JWT guard, 403 from `RolesGuard` /
`PermissionGuard`) throws *before* an interceptor would ever run, so an
interceptor-based approach would silently miss every rejected request —
exactly the case we most want captured. Middleware runs first and defers
its actual read to the `res.on('finish')` event, by which point the
whole pipeline (including guards and any exception filter) has already
run and mutated `req`/`res`, regardless of where in the chain the
request was rejected.

Responsibilities:
- Skip immediately for non-mutation methods.
- On `finish`, build a plain entry object:
  - `userId`: `req.user?.id ?? null`
  - `ip`: `req.ip`
  - `userAgent`: `req.headers['user-agent'] ?? null`
  - `method`, `statusCode`
  - `route`: `req.route?.path ?? req.originalUrl` (fallback for requests
    that never matched a route, e.g. 404s)
  - `resourceType` / `resourceId`: best-effort — first path segment
    after the API prefix, and `req.params.id` if present. Best-effort
    only; not every route has a clean singular resource (fine).
  - `requestBody`: sanitized + truncated (see below), or `null` for
    bodies that don't apply
- Call `auditLogBufferService.enqueue(entry)` — synchronous, not awaited.

### 2. `AuditLogBufferService` (`src/resources/audit-log/audit-log-buffer.service.ts`)

- In-memory array, hard capacity cap (default 5000). `enqueue()` pushes
  if under capacity; if full, increments a `droppedCount` and logs a
  warning via Nest's `Logger` (throttled to avoid log-spam-on-log-spam) —
  it never grows unbounded, never throws, never blocks the caller.
- `@Interval(2000)` handler drains the current buffer (swap-and-clear to
  avoid races with concurrent `enqueue()` calls) and issues one batched
  `repository.insert(entries)`. If the insert throws, catch and log —
  never propagate (the HTTP responses these entries belong to have
  already completed).
- This bounded-buffer design is the direct answer to "what if this gets
  flooded/DDoSed": the middleware still fires on every incoming request
  (it runs before the rate limiter, which is a guard), but the *cost* of
  each fired request is one array push, and total DB write cost is
  capped at `flushInterval × capacity`, independent of request volume.
  A crash before a flush loses at most ~2s of buffered rows — acceptable
  for this use case (same loss window as any other in-process
  fire-and-forget write), not acceptable for hard compliance guarantees.

### 3. `AuditLog` entity + repository (`src/resources/audit-log/`)

`AuditLogRepository` extends `BaseAbstractRepository<AuditLog>` for
consistency with the rest of the codebase, even though the write path
goes through the buffer service rather than direct repository calls.

```
audit_logs                            (columns camelCase, matching this
  id           bigserial PK            repo's existing entities, e.g.
  userId       int, nullable           notification.entity.ts)
  ip           varchar               -- null when unauthenticated
  userAgent    varchar, nullable
  method       varchar              -- POST/PUT/PATCH/DELETE
  route        varchar              -- matched pattern, e.g. /api/v1/tasks/:id
  resourceType varchar, nullable    -- e.g. "tasks"
  resourceId   varchar, nullable    -- e.g. "42"
  statusCode   int
  requestBody  jsonb, nullable      -- sanitized, truncated
  createdAt    timestamptz default now()
```

Indexes: `userId`, `ip`, `createdAt` (needed for any future retention
job or paginated query).

## Sensitive-data handling

A recursive sanitizer walks the parsed body before it's put on the
buffer:
- Deny-list, case-insensitive substring match: `password`, `token`,
  `secret`, `apiKey`, `accessToken`, `refreshToken`. Matching keys are
  replaced with `"[REDACTED]"` rather than removed (keeps the shape
  visible for debugging without leaking the value).
- After redaction, the JSON-stringified body is truncated to a max size
  (e.g. 10KB) before being buffered — bounds worst-case buffer memory
  per entry regardless of request size, and redaction happens *before*
  truncation so it can't be defeated by an oversized body.

## Error handling

- Middleware: never throws. Any failure while building the entry
  (unexpected shape, JSON.stringify failure on a circular body, etc.) is
  caught and logged; the request/response is completely unaffected since
  this all happens in the `finish` callback after the response is sent.
- Buffer service: `enqueue()` never throws (capacity check only). Flush
  errors are caught and logged, never rethrown.
- Net effect: this subsystem can never cause a user-facing request to
  fail, and can never be forced to do unbounded work.

## Testing

- `AuditLogBufferService`: unit tests for enqueue-under-capacity,
  enqueue-at-capacity (drop + counter), flush batching (Jest fake
  timers), and that a flush error doesn't throw.
- Sanitizer/truncation: pure-function unit tests (redaction of nested
  keys, truncation boundary).
- `AuditLogMiddleware`: unit test against mocked `req`/`res` (no full
  Nest app needed — consistent with this repo's existing pattern for
  DI-heavy code, see `google-calendar.repository.unit.spec.ts`),
  asserting it's a no-op for GET/HEAD/OPTIONS and that it builds the
  right entry (including the `userId: null` / unauthenticated case) for
  mutation methods regardless of final status code.
- No e2e test needed for v1.

## Future extensions (explicitly not v1)

- WebSocket capture (`tasks` gateway and others) — same
  buffer/flush/entity, a second capture point at the gateway level.
- Query/admin endpoint to browse `audit_logs` (would reuse
  `BaseAbstractService`/pagination patterns already in the codebase).
- Retention/archival job (the `created_at` index exists in anticipation
  of this).
