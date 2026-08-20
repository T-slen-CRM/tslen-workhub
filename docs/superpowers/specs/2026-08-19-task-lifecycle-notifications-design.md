# Task Lifecycle Notifications — Design

**Branch:** `feature/task-lifecycle-notifications` (forked from `main` @ `ff943ce`)
**Status:** Draft, pending review

## 1. Problem & Goals

Right now the only thing that generates a `Notification` row + push is a
chat message (`ChatGateway.handleMessage`). Nothing in the task domain
notifies anyone of anything. This spec adds three triggers, each firing an
in-app notification (existing `Notification` entity/bell) **and** an email
(existing `MailService`/Handlebars) to the affected users:

1. **Assignment** — a user is added as an assignee on a task.
2. **Comment** — someone comments on a task.
3. **Phase move** — a task's `phaseId` changes.

Confirmed business rules (from the two `AskUserQuestion` rounds this
session):

- **Self-exclusion is uniform**: the actor never notifies themselves, for
  any of the three triggers.
- **Assignment** only fires for assignees *newly added* in this update —
  diff old vs. new `taskUserAssignmentRelations`, don't re-notify existing
  assignees on every unrelated save.
- **Comment** notifies the task's assignees and its author (excluding the
  commenter if they're one of those).
- **Phase move** notifies the task's assignees and its author (excluding
  the mover if they're one of those) — same recipient pattern as comment.
- **Delivery is always both** in-app notification + email together, never
  one without the other.
- **Deep link**: clicking a task notification in the bell navigates to the
  task's project board (`/pages/tasks-list/:projectId`).
- **Templates**: real Handlebars `.hbs` templates in
  `src/common/services/mail/templates/`, matching the existing
  `approve.request.hbs` convention.

## 2. Actor Identification

`TaskCommentsController` already has `@User() user: Users` from JWT auth —
comment notifications need no new actor-identification work.

`TasksGateway`, however, has **zero** actor context — no `handleConnection`,
no JWT guard, no query-param userId (unlike `ChatGateway`/`LiveKitGateway`,
which at least read an unverified `userId` off the socket handshake). There
is no REST route for task create/update/phase-move/reorder; the gateway is
the only entry point.

**Decision:** add an `actorUserId: number | null` field to `CreateTaskDto`
(`src/resources/tasks/dto/create-task.dto.ts`). `UpdateTaskDto` is
`PartialType(CreateTaskDto)` so it inherits the field for free, and the
`multiReordering` handler's `CreateTaskDto[]` payload gets it too (ignored
there — reordering doesn't trigger notifications). The frontend supplies
its own already-authenticated user id, the same client-supplied, not
JWT-verified trust model the rest of this gateway already uses. This is not
a new security guarantee for the gateway — it's consistent with the
existing weak-trust convention — and it explicitly does not fix the
pre-existing gap that nothing on this gateway verifies the caller at all.
If `actorUserId` is missing (`null`/`undefined`), the notification hook
no-ops for that call (no actor to exclude from, no "who did this" for the
email) rather than guessing.

## 3. Data Model Changes

### 3.1 `Notification.link`

Add a nullable `link` column to `src/resources/notifications/entities/notification.entity.ts`:

```ts
@Column('varchar', { name: 'link', nullable: true, length: 500 })
    link: string | null;
```

New migration `migrations/add-notifications-link-column/<timestamp>-AddNotificationsLinkColumn.ts`
(same up/down raw-SQL style as `1787200000000-AddNotificationsTable.ts`):

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationsLinkColumn<TIMESTAMP> implements MigrationInterface {
    name = 'AddNotificationsLinkColumn<TIMESTAMP>'

    public async up (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" ADD "link" varchar(500)`);
    }

    public async down (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "link"`);
    }
}
```

(Implementer picks the actual millisecond timestamp at write time, one
higher than `1787200000000`, matching the existing filename/class-name
pattern.)

`NotificationsService.createForUser` gets a new optional 4th parameter:

```ts
createForUser (userId: number, title: string, message: string, link: string | null = null): Promise<Notification> {
    return this.repository.create({ userId, title, message, isRead: 0, link });
}
```

### 3.2 `CreateTaskDto.actorUserId`

```ts
@IsOptional()
@IsInt()
    actorUserId: number | null;
```

Added alongside the existing fields in `create-task.dto.ts`. Not persisted
on `Tasks` (no matching entity column) — TypeORM's `save()` in
`TasksRepository.createOneWithRelations`/`updateOneWithRelations` silently
ignores unknown-to-entity properties passed in a plain object, so this is
safe to leave on the DTO without an entity change. The notification hook
reads it off the DTO before it reaches the repository.

## 4. New `TaskNotificationsService`

New file `src/resources/tasks/task-notifications.service.ts`, injected into
`TasksModule` and `TaskCommentsModule`. Centralizes all three triggers so
the emailing/in-app-notification/push logic lives in one place instead of
being duplicated across `TasksService` and `TaskCommentsService`.

```ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../../common/services/mail/mail.service';
import { LiveKitGateway } from '../live-kit/gateway/live-kit.gateway';
import { Tasks } from './entities/task.entity';
import { Users } from '../users/entities/users.entity';

interface NotifyRecipient {
    id: number;
    email: string;
    firstName: string;
}

@Injectable()
export class TaskNotificationsService {
    private readonly logger = new Logger(TaskNotificationsService.name);

    constructor (
        private readonly notificationsService: NotificationsService,
        private readonly mailService: MailService,
        private readonly liveKitGateway: LiveKitGateway,
        private readonly configService: ConfigService,
    ) {}

    private buildLink (task: Tasks): string {
        const frontendDomain = this.configService.get('FRONT_DOMAIN');
        return `${frontendDomain}/pages/tasks-list/${task.projectId}`;
    }

    private async deliver (
        recipient: NotifyRecipient,
        title: string,
        message: string,
        link: string,
        template: string,
        context: Record<string, unknown>,
    ): Promise<void> {
        try {
            const notification = await this.notificationsService.createForUser(recipient.id, title, message, link);
            this.liveKitGateway.notifyUser(recipient.id, notification);
        } catch (e) {
            this.logger.error(`Failed to create/push in-app notification for user ${recipient.id}: ${e.message}`);
        }
        try {
            await this.mailService.sendMail({
                to: recipient.email,
                subject: title,
                template: `./${template}`,
                context: { ...context, recipient, link },
            });
        } catch (e) {
            this.logger.error(`Failed to email user ${recipient.id}: ${e.message}`);
        }
    }

    async notifyAssigned (task: Tasks, newAssignees: Users[], actor: Users | null): Promise<void> {
        const link = this.buildLink(task);
        const recipients = newAssignees.filter(u => !actor || u.id !== actor.id);
        for (const user of recipients) {
            await this.deliver(
                { id: user.id, email: user.email, firstName: user.firstName },
                'You were assigned a task',
                `${actor ? actor.firstName + ' ' + actor.lastName : 'Someone'} assigned you to "${task.title}"`,
                link,
                'task.assigned.hbs',
                { task, actor },
            );
        }
    }

    async notifyCommented (task: Tasks, commentContent: string, commenter: Users, recipients: Users[]): Promise<void> {
        const link = this.buildLink(task);
        const filtered = recipients.filter(u => u.id !== commenter.id);
        for (const user of filtered) {
            await this.deliver(
                { id: user.id, email: user.email, firstName: user.firstName },
                'New comment on your task',
                `${commenter.firstName} ${commenter.lastName} commented on "${task.title}"`,
                link,
                'task.commented.hbs',
                { task, commenter, commentContent },
            );
        }
    }

    async notifyPhaseMoved (task: Tasks, fromPhaseName: string, toPhaseName: string, recipients: Users[], actor: Users | null): Promise<void> {
        const link = this.buildLink(task);
        const filtered = recipients.filter(u => !actor || u.id !== actor.id);
        for (const user of filtered) {
            await this.deliver(
                { id: user.id, email: user.email, firstName: user.firstName },
                'Task moved to a new phase',
                `"${task.title}" moved from ${fromPhaseName} to ${toPhaseName}`,
                link,
                'task.phase-moved.hbs',
                { task, actor, fromPhaseName, toPhaseName },
            );
        }
    }
}
```

`FRONT_DOMAIN` is an existing config key (`.env.example:17`,
`FRONT_DOMAIN=https://crm.t-slen.com`), sibling to the `BACKEND_DOMAIN` key
already read in `events-by-user.service.ts` — no new env var is needed.

Each `deliver()` call wraps in-app and email independently in try/catch —
one recipient's bad email address must not block their in-app notification
or the next recipient's delivery, matching the existing
`try/catch`-isolation pattern already used in `ChatGateway.handleMessage`.

## 5. Trigger Hook Points

### 5.1 Assignment — `TasksService.update()` override

`TasksGateway.updateTask` is the only caller of task update
(`this.tasksService.update(updateTaskDto.id, updateTaskDto)`).
`BaseAbstractService.update()` already fetches the pre-update entity via
`findOne(id)` before merging — `Tasks.taskUserAssignmentRelations` is
`eager: true`, so that fetch already includes the *old* assignee list. This
is the exact diff point; no separate lookup is needed.

Override `update()` in `TasksService` (`src/resources/tasks/tasks.service.ts`):

```ts
async update (id: number, data: CreateTaskDto): Promise<Tasks> {
    const before: Tasks = await this.currentRepository.findOne(id);
    const oldAssigneeIds = new Set((before?.taskUserAssignmentRelations ?? []).map(r => r.userId));
    const oldPhaseId = before?.phaseId ?? null;

    const updated = await super.update(id, data);

    const actor = data.actorUserId ? await this.usersService.findOneById(data.actorUserId, null) : null;

    const newAssignees = (updated.taskUserAssignmentRelations ?? [])
        .filter(r => !oldAssigneeIds.has(r.userId))
        .map(r => r.user);
    if (newAssignees.length > 0) {
        await this.taskNotificationsService.notifyAssigned(updated, newAssignees, actor);
    }

    if (data.phaseId !== undefined && data.phaseId !== null && data.phaseId !== oldPhaseId) {
        const recipients = await this.collectTaskRecipients(updated);
        const [fromPhase, toPhase] = await Promise.all([
            oldPhaseId ? this.taskPhaseService.findOneById(oldPhaseId, null) : null,
            this.taskPhaseService.findOneById(data.phaseId, null),
        ]);
        await this.taskNotificationsService.notifyPhaseMoved(
            updated,
            fromPhase?.name ?? 'a previous phase',
            toPhase?.name ?? 'a new phase',
            recipients,
            actor,
        );
    }

    return updated;
}

async collectTaskRecipients (task: Tasks): Promise<Users[]> {
    const assignees = (task.taskUserAssignmentRelations ?? []).map(r => r.user);
    const authorId = task.createdBy ? Number(task.createdBy) : null;
    if (authorId && !assignees.some(u => u.id === authorId)) {
        const author = await this.usersService.findOneById(authorId, null);
        if (author) {
            assignees.push(author);
        }
    }
    return assignees;
}
```

`TasksService` needs two new constructor dependencies:
`TaskNotificationsService` and `TaskPhaseService` (existing service,
`src/resources/task-phase/task-phase.service.ts` — extends
`BaseAbstractService<TaskPhase>` with no overrides, so its inherited
`findOneById(id, user)` is the correct call, as used above). `TasksModule`
must import
`TaskPhaseModule` (or have it export `TaskPhaseService`) and provide the
new `TaskNotificationsService`, plus import `NotificationsModule`,
`MailModule`, and `LiveKitModule` (for `TaskNotificationsService`'s own
dependencies — Nest DI requires the providing modules to be imported
wherever the consuming module is registered, not just re-exported
transitively).

`createdBy` is a `varchar` string field on `Tasks` (see
`task.entity.ts`), storing the author's user id as a string, not a
relation — hence `Number(task.createdBy)` above.

### 5.2 Comment — `TaskCommentsController.create()`

`TaskCommentsService` doesn't override `create()`, and there is no
old-vs-new diff needed here (a comment is always new). Simplest correct
hook point is the controller, right after the comment is persisted —
it already has the authenticated `@User() user` and the DTO's `taskId`:

```ts
@Post()
async create (
    @Body() createTaskCommentDto: CreateTaskCommentDto,
    @User() user: Users,
): Promise<TaskComment> {
    const comment = await this.taskCommentsService.create({
        taskId: createTaskCommentDto.taskId,
        content: createTaskCommentDto.content,
        userId: user.id,
    });
    const task = await this.tasksService.findOneById(createTaskCommentDto.taskId, null);
    if (task) {
        const recipients = await this.tasksService.collectTaskRecipients(task);
        await this.taskNotificationsService.notifyCommented(task, comment.content, user, recipients);
    }
    return comment;
}
```

`collectTaskRecipients` moves from `private` to a regular method on
`TasksService` (still not part of a public interface elsewhere, just
accessible to the controller) since both the phase-move hook and the
comment hook need identical "assignees + author, deduped" recipient logic.
`TaskCommentsController` gains `TasksService` and `TaskNotificationsService`
as new constructor dependencies; `TaskCommentsModule` must import
`TasksModule` (for `TasksService`, already exported — see
`tasks.module.ts`'s `exports: [TasksService, TasksRepository]`) and provide
`TaskNotificationsService`, or import whichever module ends up owning it
(see §6).

## 6. Where `TaskNotificationsService` Lives

To avoid a circular-module dependency (`TasksModule` needs it for the
assignment/phase-move hooks, `TaskCommentsModule` needs it for the comment
hook, and it itself needs `NotificationsModule`/`MailModule`/`LiveKitModule`),
`TaskNotificationsService` gets its own module:

`src/resources/tasks/task-notifications.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TaskNotificationsService } from './task-notifications.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../../common/services/mail/mail.module';
import { LiveKitModule } from '../live-kit/live-kit.module';

@Module({
    imports: [NotificationsModule, MailModule, LiveKitModule],
    providers: [TaskNotificationsService],
    exports: [TaskNotificationsService],
})
export class TaskNotificationsModule {}
```

Both `TasksModule` and `TaskCommentsModule` import `TaskNotificationsModule`.
`AppModule` needs no new entry — it only imports `TasksModule` and
`TaskCommentsModule`, both of which now transitively pull in
`TaskNotificationsModule`.

## 7. Email Templates

Three new files under `src/common/services/mail/templates/`, matching the
plain-HTML-plus-`{{ }}`-interpolation style of `approve.request.hbs`.

`task.assigned.hbs`:
```hbs
<p>Hi {{ recipient.firstName }},</p>
<p>{{#if actor}}{{ actor.firstName }} {{ actor.lastName }}{{else}}Someone{{/if}} assigned you to a task: <strong>{{ task.title }}</strong>.</p>
<p><a style="color:#1b73e7" href="{{ link }}">View task</a></p>
```

`task.commented.hbs`:
```hbs
<p>Hi {{ recipient.firstName }},</p>
<p>{{ commenter.firstName }} {{ commenter.lastName }} commented on <strong>{{ task.title }}</strong>:</p>
<p>{{ commentContent }}</p>
<p><a style="color:#1b73e7" href="{{ link }}">View task</a></p>
```

`task.phase-moved.hbs`:
```hbs
<p>Hi {{ recipient.firstName }},</p>
<p><strong>{{ task.title }}</strong> was moved from {{ fromPhaseName }} to {{ toPhaseName }}{{#if actor}} by {{ actor.firstName }} {{ actor.lastName }}{{/if}}.</p>
<p><a style="color:#1b73e7" href="{{ link }}">View task</a></p>
```

`MailerModule`'s Handlebars adapter is configured with `template.dir`
pointing at `src/common/services/mail/templates` already (see
`mail.module.ts`), so no config change is needed — dropping the `.hbs`
files in that directory is sufficient.

## 8. Frontend Changes

### 8.1 `actorUserId` on outgoing gateway payloads

Wherever the frontend emits `TasksEvents.UPDATE`/`CREATE` over the tasks
socket (implementer locates the exact call site — likely a
`TasksSocketService`/`TasksService`-equivalent under
`packages/web/src/app/pages/` paralleling `ChatService`/`LiveKitWebSocketService`),
add `actorUserId: <current user id>` to the emitted payload. The current
user id is already available app-wide (used elsewhere for `localUserId`
inputs, e.g. `ChatComponent`).

### 8.2 `Notification.link` + deep-link navigation

`packages/web/src/app/interfaces/notifications.ts` gets a new optional
field:

```ts
export interface Notification {
    id: number;
    title: string;
    message: string;
    time?: string;
    isRead: number;
    userId?: number;
    createdAt?: Date;
    link?: string;
}
```

`NotificationBellComponent.getNotifications()` and the live-notification
handler in `ngOnInit()` (both in
`packages/web/src/app/tslen-components/notification-bell/notification-bell.component.ts`)
both map raw API/socket payloads into the local `Notifications` array —
both mapping blocks add `link: item.link` / `link: notification.link`
alongside the existing fields.

`openNotification()` gains navigation, using Angular's `Router` (new
`inject(Router)` dependency, matching this component's existing
constructor-injection-via-`inject()` style):

```ts
openNotification(notification: Notification): void {
    if (notification.isRead === 0) {
        // ...existing mark-as-read logic, unchanged...
    }
    if (notification.link) {
        this.router.navigateByUrl(notification.link.replace(/^https?:\/\/[^/]+/, ''));
    } else {
        this.openDialog(notification);
    }
}
```

`notification.link` is stored as a full URL (`FRONT_DOMAIN` + path, per
§4's `buildLink`) for the email template's `<a href>` to work standalone;
the bell strips the origin before calling `Router.navigateByUrl` so it
navigates in-app via Angular's router rather than doing a full page
reload. Chat notifications (no `link`, unaffected by this feature) keep
falling through to the existing `openDialog()` behavior.

## 9. Out of Scope

- Fixing `TasksGateway`'s broader lack of real socket authentication (the
  `actorUserId` field is client-supplied, same trust level as the rest of
  this gateway — not a new guarantee).
- Notification preferences / opt-out per user.
- Batching multiple rapid-fire notifications (e.g., five comments in a
  minute) into a single email.
- Any notification for task *deletion* or task *creation* itself (not
  requested).
- Un-assignment (removing an assignee) — only *newly added* assignees
  trigger a notification, per the confirmed business rule.
