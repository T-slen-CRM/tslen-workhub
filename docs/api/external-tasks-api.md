# External Tasks API

A small REST API for creating and listing tasks from outside the app —
scripts, CI pipelines, Zapier, Slack bots, or any other external tool.
Modeled on how Jira/GitHub expose personal access tokens for API access,
separate from the interactive login session the web app itself uses.

This is additive: it doesn't change or replace the internal REST/WebSocket
endpoints the frontend uses for task management.

- **Base URL:** `https://<your-domain>/api/v1` (the app's global API prefix
  — `/api/v1` in the default `.env.example` config, via `API_VERSION`)
- **Auth:** a personal API token, sent as `Authorization: Bearer <token>`

## 1. Getting an API token

Tokens are personal — generating and managing them requires being logged
in normally first (a session JWT from `POST /auth/login`). Once you have a
token, you don't need the JWT again for the endpoints it unlocks.

### Log in

```
POST /auth/login
Content-Type: application/json

{ "email": "you@example.com", "password": "yourpassword" }
```

**Response `200`:**
```json
{ "accessToken": "eyJhbGciOi..." }
```

### Create a token

```
POST /api-tokens
Authorization: Bearer <jwt>
Content-Type: application/json

{ "name": "Zapier integration" }
```

**Response `201`:**
```json
{
  "id": 2,
  "name": "Zapier integration",
  "token": "72a70a148b79dd1ca5b0cb380548104df542d141023b23a2e6cfe22380498f45",
  "createdAt": "2026-08-18T12:23:43.879Z"
}
```

> **`token` is shown exactly once, right here.** Only a one-way hash of it
> is stored — there is no way to retrieve a lost token afterwards. If you
> lose it, revoke it and create a new one.

The token acts as **you** — every call it makes is attributed to your
account (`createdBy`/`createdByName` on anything it creates), with your
permissions. Treat it like a password.

### List your tokens

```
GET /api-tokens
Authorization: Bearer <jwt>
```

**Response `200`:**
```json
[
  { "id": 2, "name": "Zapier integration", "createdAt": "2026-08-18T12:23:43.879Z", "lastUsedAt": "2026-08-18T12:24:15.094Z" }
]
```

Never includes the token value itself — only enough to tell your tokens
apart and see when one was last used.

### Revoke a token

```
DELETE /api-tokens/:id
Authorization: Bearer <jwt>
```

**Response `200`.** `404` if the id doesn't exist or isn't one of your own
tokens. Revocation is immediate and permanent — any client using that
token starts getting `401` right away.

## 2. Working with tasks

Everything below uses the **API token**, not the JWT:
`Authorization: Bearer <api-token>`

### List tasks

```
GET /external/tasks
GET /external/tasks?projectId=15
GET /external/tasks?phaseId=24
GET /external/tasks?status=inProgress
GET /external/tasks?projectId=15&phaseId=24&status=inProgress
```

All three query params are optional and combine as AND filters. With no
params, returns every task (same as the internal task list — there's no
per-user visibility scoping on this endpoint today, matching existing
behavior).

**Response `200`:** an array of task objects (same shape the app uses
internally — `id`, `title`, `description`, `phaseId`, `projectId`,
`status`, `priority`, `createdBy`, `createdByName`, `createdAt`,
`updatedAt`, etc.).

### Create a task

```
POST /external/tasks
Content-Type: application/json

{
  "title": "Fix the checkout bug",
  "description": "Optional longer description",
  "phaseId": 24,
  "priority": "high",
  "assigneeEmail": "someone@example.com"
}
```

| Field | Required | Notes |
|---|---|---|
| `title` | yes | non-empty string |
| `phaseId` | yes | must be a real, existing phase (see below) |
| `description` | no | |
| `priority` | no | free-text string |
| `assigneeEmail` | no | |

**Response `201`:** the created task, including the fields the server
filled in — notably `projectId`.

**You never send `projectId`.** Every phase belongs to exactly one
project, so the server looks up `phaseId` and derives `projectId` from it
automatically. This also means a `phaseId`/`projectId` pair can never
disagree with each other, because you can't send a `projectId` at all.

`createdBy` and `createdByName` always come from whoever the token
belongs to — not from anything in the request body.

**Finding a valid `phaseId`:** phases aren't exposed through this API
(only tasks are, for now). Use the internal `GET /task-phase` endpoint
(JWT auth) to look one up, or ask whoever manages the project for it.

### Errors

| Status | When |
|---|---|
| `401 Unauthorized` | missing/invalid/revoked `Authorization: Bearer` token |
| `404 Not Found` | `phaseId` doesn't exist |
| `404 Not Found` | `phaseId` exists but has no project attached (an orphaned/incomplete phase — can't create a task without a project) |
| `400 Bad Request` | request body fails validation (e.g. missing `title`) |

## 3. Full example

```bash
# 1. Log in
JWT=$(curl -s -X POST https://your-domain/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['accessToken'])")

# 2. Create an API token (save the "token" field from the response - shown once)
curl -s -X POST https://your-domain/api/v1/api-tokens \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -d '{"name":"my integration"}'

# 3. From here on, use the API token, not the JWT
API_TOKEN="<the token from step 2>"

curl -s https://your-domain/api/v1/external/tasks \
  -H "Authorization: Bearer $API_TOKEN"

curl -s -X POST https://your-domain/api/v1/external/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{"title":"Created from a script","phaseId":24}'
```

## 4. What this API deliberately doesn't do (yet)

- No task update or delete — only list and create.
- No frontend UI for managing tokens — `/api-tokens` is REST-only; use
  curl/Postman/a script.
- No dedicated, versioned response schema — task objects are returned in
  the same shape the app uses internally, which may grow fields over
  time. Don't assume the field list above is exhaustive or frozen.
- No per-token scoping/permissions narrower than "acts as the owning
  user" — a token can do anything that user's account can do through
  this API.
