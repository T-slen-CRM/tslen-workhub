# Guest Meeting Links — Design

## Problem

The existing call feature (`src/resources/live-kit/`) only supports 1:1
calls between two known platform users: rooms are named
`room-{callerId}-{calleeId}` and both the LiveKit token endpoint
(`POST /api/token`) and the app route (`call/:callerId/:calleeId`) require
a valid session JWT via the global `AuthGuard`. There is no way to invite
someone who doesn't have a platform account.

We want a "pre-call" meeting link: any authenticated user can create a
shareable URL for a room; anyone who opens that URL — logged in or not —
can join the call as a named guest. A guest must be able to use the call
itself (audio/video, in-call chat, screen share) but must not gain access
to any other platform feature (tasks, other chats, admin, etc.).

## Goal

1. An authenticated user ("host") can create, list, and revoke meeting
   links, each backed by its own multi-party LiveKit room.
2. Anyone with a valid, non-expired, non-revoked link can join that room
   by entering a display name — no account, no login.
3. A guest's access is architecturally confined to that one call: they
   never receive a platform JWT, so no other REST endpoint or WebSocket
   feature is reachable with what they're issued.
4. In-call chat is ephemeral and room-scoped — not tied to the platform's
   Users-based chat system, since guests aren't Users.
5. This is additive: the existing direct 1:1 call (call button → ring →
   answer) is untouched.

## Non-goals

- Host in-call moderation controls (mute/remove participant) — out of
  scope for v1, can be added later via elevated LiveKit grants on the
  host's token.
- Persisting meeting chat history.
- Recording.

## Design

### 1. Data model & backend API

New module `src/resources/meeting-links/`.

New entity `MeetingLink` (`entities/meeting-link.entity.ts`):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `token` | varchar(64), unique | Stored hashed, same pattern as `ApiToken` (`hashApiToken` in `src/resources/api-tokens/utils/hash-token.ts`, reused here) |
| `hostUserId` | FK → `Users` | |
| `roomName` | varchar, unique | `meeting-{uuid}` |
| `title` | varchar, nullable | |
| `expiresAt` | timestamp, nullable | |
| `revokedAt` | timestamp, nullable | |
| `createdAt` | timestamp | |

Endpoints:

- `POST /api/meeting-links` (authenticated, global `AuthGuard`) — host
  creates a link: body `{ title?, expiresAt? }`. Generates a random
  token + `roomName`, stores the hashed token, returns
  `{ id, token, roomName, expiresAt }`. The raw token is only ever
  returned here. Following the existing `currentRoomLink` pattern in
  `call.component.ts` (built client-side from `window.location.origin`,
  not server-constructed), the frontend builds the shareable URL as
  `window.location.origin + '/meet/' + token` — the backend never
  constructs a frontend URL.
- `GET /api/meeting-links` (authenticated) — list the host's own links.
- `DELETE /api/meeting-links/:id` (authenticated, ownership-checked) —
  sets `revokedAt`.
- `GET /api/meeting-links/public/:token` — `@SkipAuth()` — validates the
  token (exists, not expired, not revoked) and returns only
  `{ title, hostName, roomName }` for the guest landing page. Returns 404
  for an unknown token, 410 for expired/revoked — no other host detail is
  exposed.
- `POST /api/meeting-links/:token/join` — `@SkipAuth()` +
  `MeetingGuestGuard` — body `{ displayName }`. Re-validates the token,
  mints a **guest-restricted** LiveKit access token (see §2) for
  `roomName` with participant identity `guest-{uuid}` and the given
  display name. Returns `{ livekitToken, roomName, livekitUrl }`.

The host joins their own meeting through the existing authenticated
`POST /api/token` flow, passing the link's `roomName` instead of the
`room-{callerId}-{calleeId}` scheme — no change needed there beyond
accepting an arbitrary `roomName` (it already takes `roomName` as input).

### 2. Security & restricting guests to "call only"

Two independent layers enforce the restriction:

**REST/API layer (holds by construction).** A guest never receives a
platform JWT — only an opaque `livekitToken`, which the app's `AuthGuard`
doesn't recognize as a bearer credential. Every other endpoint keeps
requiring `Authorization: Bearer <jwt>` via the existing global
`AuthGuard` (`src/resources/auth/auth.module.ts`'s `APP_GUARD`). No new
blocklist logic is needed: a guest is architecturally incapable of
calling any other endpoint. `MeetingGuestGuard` itself is scoped to the
single `join` route only, mirroring
`src/resources/external-tasks/external-tasks.controller.ts`'s
`@UseGuards(ApiTokenGuard) @SkipAuth()` pattern — it grants no broader
access.

`MeetingGuestGuard` (`src/resources/meeting-links/guards/meeting-guest.guard.ts`):
extracts `token` from the route param, looks up the hashed token, checks
`revokedAt`/`expiresAt`, and on success sets `request['guest'] =
{ roomName, meetingLinkId }` — deliberately **not** `request.user`, so
nothing downstream can mistake a guest for an authenticated `Users` row.

**LiveKit room-grant layer (in-call restriction).**
`src/resources/live-kit/microservice/live-kit.grpc.service.ts` gains a
guest token-minting path issuing an `AccessToken` with a restricted
`VideoGrant`:

```
roomJoin: true, room: roomName,
canPublish: true, canSubscribe: true, canPublishData: true
```

No `roomAdmin`, `roomCreate`, `recorder`, or metadata-update grants
beyond the participant's own display name. `canPublishData` is required
for the ephemeral chat channel (§3). The host's existing token path is
unchanged for v1 (no elevated grants — see Non-goals).

### 3. Ephemeral in-call chat

Implemented purely via LiveKit's built-in data channel — no new NestJS
gateway, no new auth surface, no persistence:

- Send: `room.localParticipant.publishData(...)` with `reliable: true`,
  payload `{ senderName, text, ts }` (JSON, UTF-8 encoded).
- Receive: the room's `DataReceived` event.

A new `MeetingChatComponent`, mounted inside `MeetingRoomComponent`
(§4), sends/receives over this channel. It works identically for host
and guests since both already hold a live LiveKit room connection —
nothing new to authenticate. Nothing survives the call ending.

### 4. Frontend

- New public route `/meet/:token`, registered as a **top-level** route
  (sibling to `pages`, not nested under it) so the global `AuthGuard`
  covering `pages/*` never intercepts it. Lives under
  `packages/web/src/app/guest-meeting/`.
- `GuestMeetingLandingComponent`: on load, calls
  `GET /api/meeting-links/public/:token`.
  - Invalid/expired/revoked → "This meeting link is no longer valid."
  - Valid → shows title/host name + a display-name input + Join button.
  - On Join: `POST /api/meeting-links/:token/join` → receives
    `{ livekitToken, roomName, livekitUrl }` → hands off to
    `MeetingRoomComponent`.
- `MeetingRoomComponent` (new, shared): the LiveKit connect/media-track
  rendering logic extracted from the reusable parts of the existing
  `CallComponent` (`packages/web/src/app/pages/call/wellcome/call.component.ts`),
  parameterized only by how it obtained its LiveKit token/room —
  the guest flow and the host's authenticated flow both render it, so
  the connect/track/controls logic isn't duplicated. Includes
  `MeetingChatComponent` (§3).
- Host-side "Create meeting link" UI: a new form/list (title + optional
  expiry input, list of the host's active links with copy-link and
  revoke actions) calling the `meeting-links` REST endpoints from §1.
  Host joining their own link renders `MeetingRoomComponent` under the
  existing authenticated route tree.
- All new components use signal `input()`/`inject()` — no `@Input()` —
  per this repo's Angular conventions (`AGENTS.md`).

### 5. Testing

**Backend unit** (`test/unit/resources/meeting-links/`):
- `MeetingLinksService`: token generation/hashing, expiry check, revoke.
- `MeetingGuestGuard`: valid / expired / revoked / missing token →
  allow / `UnauthorizedException` / `GoneException`.

**Backend e2e** (`test/integration/`):
- Create link as authenticated user → `GET public/:token` unauthenticated
  succeeds → `POST :token/join` unauthenticated succeeds and returns a
  LiveKit token.
- Revoked or expired link → `public/:token` and `:token/join` both
  reject.
- A guest's `livekitToken` cannot be used as a Bearer JWT against an
  unrelated protected route (asserts the architectural isolation from
  §2's REST layer).

**Frontend specs**: `GuestMeetingLandingComponent` (valid/invalid link
states, join flow) and the meeting-link create/list/revoke UI, mocking
the service directly (`jasmine.createSpyObj`) per the existing
`chat.component.spec.ts` pattern — no real HTTP or DI graph.
