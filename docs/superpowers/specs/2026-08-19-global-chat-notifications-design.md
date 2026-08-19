# Global Chat Notifications — Design

## Problem

Chat messages only reach a user while they have the specific 1:1 chat
room open (`ChatComponent`, embedded only in `LiveChatComponent`, only
rendered on the `live-kit` page). A message sent while the recipient is
anywhere else in the app is silently missed — there's no persisted
record and no notification.

Separately, the top nav already has a notification bell with a badge
(`nav-right.component.html`/`.ts`) and a full client-side implementation
(`getNotifications`, `markAsRead`, `clearAll`, the `Notification`
interface, `NotificationService`) — but it's all dead code, commented
out in `ngOnInit`, because the backend routes it calls
(`GET /notifications`, `POST /notifications/mark-as-read/`,
`POST /notifications/clear-all/`, `PATCH /notifications/:id`) were never
implemented. There's also a `notification-form` admin component that
posts to `POST /notifications/create` to broadcast an announcement to
every user — also dead, same reason. Neither the `Notification`
entity/table nor a `NotificationsModule` exists anywhere in `src/`.

The left nav sidebar has no notifications entry at all today.

## Goal

1. A chat message creates a persisted, per-recipient notification and
   (if the recipient is online) pushes it to them live, regardless of
   which page they're on.
2. The existing top-nav bell becomes real (backend now exists to back
   it) and gets extracted into a shared component also used in the left
   nav, so both show the same live-updating unread badge.
3. The notifications backend is general-purpose (not chat-specific), so
   the existing dead broadcast-announcement UI (`notification-form`)
   becomes real too, for free.

## Existing infrastructure this design reuses

- **A global, always-on, per-user socket already exists.**
  `LiveKitWebSocketService` (frontend, `providedIn: 'root'`) connects in
  its own constructor, waits for auth, then stays connected for the
  whole logged-in session regardless of route — it's how incoming call
  notifications already work. `LiveKitGateway` (backend, `namespace:
  'live-kit'`) keeps `users: Map<userId, Socket>`, populated by the
  client's `register` event on connect, and already has a working
  targeted-delivery pattern (`callee.emit(...)` for `incoming_call`).
  This design adds a `notification` event to that same pair instead of
  building new socket infrastructure.
- **Chat rooms are 1:1, and the room id already encodes both
  participants.** `LiveChatComponent` computes `chatRoomId` as
  `` `${min(userIdA,userIdB)}_${max(userIdA,userIdB)}` `` (sorted, so
  it's the same string regardless of who opens the chat first). The
  backend can recover the recipient by splitting on `_` and taking the
  id that isn't the sender's — no new "room membership" table needed.
- **The left nav already has a slot for exactly this.** In
  `nav-content.component.html`, right after the `*ngFor` over
  `NavigationItem`s, there's a commented-out
  `<app-dark-mode-button>` — an existing, if unused, precedent for
  embedding a standalone interactive component in the sidebar outside
  the data-driven nav-item list. The new notification bell goes there,
  not as a fake `NavigationItem` (nav items are plain routable links;
  a bell needs a click-to-toggle dropdown, which the generic
  `nav-item.component` template doesn't support).

## Backend design

### `Notification` entity + migration

New `src/resources/notifications/entities/notification.entity.ts`:

```typescript
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
      id: number;

  @Column('int', { name: 'userId' })
      userId: number;

  @Column('varchar', { name: 'title', length: 250 })
      title: string;

  @Column('varchar', { name: 'message', length: 500 })
      message: string;

  @Column('int', { name: 'isRead', default: 0 })
      isRead: number;

  @CreateDateColumn({ name: 'createdAt' })
      createdAt: Date;
}
```

Matches the frontend's existing `Notification` interface
(`packages/web/src/app/interfaces/notifications.ts`) exactly —
`isRead` stays a `number` (0/1), consistent with `isActive`/other
0-or-1 flags elsewhere in this codebase, not a boolean.

Migration: `migrations/add-notifications-table/<timestamp>-AddNotificationsTable.ts`,
following the same shape as `add-api-tokens-table` from the External
Tasks API work.

### `NotificationsRepository` / `NotificationsService` / `NotificationsController`

Standard `BaseAbstractRepository`/`BaseAbstractService` pattern (matches
every other resource in this codebase), plus:

- `NotificationsRepository.findAllForUser(userId): Promise<Notification[]>`
  — `find({ where: { userId }, order: { createdAt: 'DESC' } })`.
- `NotificationsRepository.markManyAsRead(ids: number[]): Promise<void>`
  — bulk update `isRead = 1` for those ids.
- `NotificationsRepository.createMany(notifications: Partial<Notification>[]): Promise<Notification[]>`
  — bulk insert, for the broadcast-to-all-users case.

Controller routes (JWT-guarded, matching the frontend calls verbatim —
no frontend changes needed beyond un-commenting):

| Route | Frontend caller | Behavior |
|---|---|---|
| `GET /notifications` | `nav-right.component.ts` `getNotifications()` | current user's notifications, newest first |
| `PATCH /notifications/:id` | `openNotification()` via `dataService.updateData` | mark one as read (`{isRead: 1}` body) |
| `POST /notifications/mark-as-read/` | `markAsRead()` | body is a raw `number[]` of ids, marks all as read |
| `POST /notifications/clear-all/` | `clearAll()` | deletes the given ids (frontend already treats this as "gone", not "read") |
| `POST /notifications/create` | `notification-form.component.ts` | body is a raw `Notification[]` (already built client-side via `prepareNotificationsForAllUsers`), bulk-inserts |

`GET`/`PATCH`/mark-as-read/clear-all all implicitly scope to
`@User() user` from the JWT — a user can only ever read or mutate their
own notifications. `create` has no such scoping (it's the admin
broadcast path, already gated by whatever guards the `notification-form`
component's route today).

### `LiveKitGateway` — reusable per-user push

Add one small addition to the existing gateway
(`src/resources/live-kit/gateway/live-kit.gateway.ts`):

```typescript
public notifyUser(userId: number, payload: unknown): void {
    const socket = this.users.get(String(userId));
    if (socket) {
        socket.emit(LiveKitEvents.NOTIFICATION, payload);
    }
}
```

(`LiveKitEvents.NOTIFICATION = 'notification'` added to the enum, both
backend `src/resources/live-kit/enum/live-kit.enum.ts` and frontend
`packages/web/src/app/pages/live-kit/enum/live-kit.enum.ts`.)

`LiveKitModule` needs `exports: [LiveKitGateway]` added (currently
exports nothing) so other modules can inject it.

### `ChatGateway` integration

In `handleMessage`, after the existing `saveMessage` call:

```typescript
const recipientId = chatRoomId.split('_').map(Number).find((id) => id !== Number(senderId));
if (recipientId) {
    const notification = await this.notificationsService.create({
        userId: recipientId,
        title: `New message`,
        message: content.length > 100 ? content.slice(0, 100) + '…' : content,
        isRead: 0,
    } as never);
    this.liveKitGateway.notifyUser(recipientId, notification);
}
```

`NotificationsModule` needs `exports: [NotificationsService]` (matching
the `exports: [TaskProjectRepository]` pattern from `TaskProjectModule`
earlier this session), and `ChatModule` needs
`imports: [MessageModule, NotificationsModule, LiveKitModule]`
(currently only imports `MessageModule`).

This only fires for a message actually sent through the socket — it
doesn't touch anything else about how `ChatGateway` already works
(room-scoped `message` emit for whoever's actually in the room is
unchanged; this is additive).

## Frontend design

### `NotificationBellComponent` (new, shared)

New `packages/web/src/app/tslen-components/notification-bell/` —
extracts the bell icon + `matBadge` + dropdown list + `markAsRead`/
`clearAll`/`openNotification` logic currently living directly in
`nav-right.component.ts`/`.html`. Same inputs it needs today
(`userId`), same `NotificationService`/`DataService` dependencies.
`nav-right.component.html` replaces its inline bell markup with
`<app-notification-bell [userId]="userId"></app-notification-bell>`.

### Left nav placement

In `nav-content.component.html`, replace the commented-out
`dark-mode-button` block's neighbor spot with:

```html
<div class="notification-bell-nav">
    <app-notification-bell [userId]="userId"></app-notification-bell>
</div>
```

`nav-content.component.ts` already exposes `public userId: number`
(set from `authData.id` in `ngOnInit`), the same field the
commented-out `dark-mode-button` block already used — no new input
plumbing needed.

### Live badge updates

`LiveKitWebSocketService` adds a `notification$` stream, listening for
`LiveKitEvents.NOTIFICATION`:

```typescript
private notification = new Subject<Notification>();
public readonly notification$ = this.notification.asObservable();
// in registerSocketListeners():
this.socket.on(LiveKitEvents.NOTIFICATION, (data: Notification) => this.notification.next(data));
```

`NotificationBellComponent` subscribes to `notification$` in `ngOnInit`
(alongside its initial `GET /notifications` load) and, on each new
notification, prepends it to its local list and increments
`NotificationService.countUnreadNotifications` — this is what makes the
badge update live on whatever page the user is currently on, since
`NotificationBellComponent` is mounted in the persistent
`AdminComponent`/nav shell, not tied to any specific route.

## Testing

- Backend: `NotificationsService`/`NotificationsRepository` unit tests
  (matching the `ApiTokensService`/`TaskProjectRepository` pattern from
  this session's earlier work) for `findAllForUser`, `markManyAsRead`,
  `createMany`.
- Backend: `ChatGateway` — a unit test asserting that on `handleMessage`,
  a notification is created for the *other* participant (parsed from
  `chatRoomId`), not the sender, and that `liveKitGateway.notifyUser` is
  called with that recipient's id.
- Backend: `LiveKitGateway.notifyUser` — asserts it emits only when the
  target user has a registered socket, and is a no-op otherwise (no
  throw for an offline user).
- Frontend: `NotificationBellComponent` — unread count reflects the
  initial `GET /notifications` load, then increments when
  `notification$` emits; `markAsRead`/`clearAll` call the right
  endpoints and clear the count.

## Out of scope

- Group chat / multi-participant rooms — the recipient-parsing logic is
  1:1-only, matching the current chat feature entirely.
- Notification preferences/mute settings.
- Push notifications outside the browser tab (desktop/mobile push,
  email digest) — this is in-app only, same as the existing dead UI it
  revives.
- Redis-backed fan-out for multi-instance deployments — matches the
  existing `ChatGateway` comment that this is explicitly single-instance
  for now.
