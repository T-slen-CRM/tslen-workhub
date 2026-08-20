# Task Lifecycle Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user is newly assigned to a task, comments on a task, or moves a task to a different phase, notify the task's assignees and author (excluding the actor) with both an in-app notification and an email, with a deep link back to the task's board.

**Architecture:** A new `TaskNotificationsService` (its own `TaskNotificationsModule`, to avoid a circular dependency between `TasksModule` and `TaskCommentsModule`) centralizes delivery: create an in-app `Notification` row, push it live over the existing `LiveKitGateway`, and send an email via the existing `MailService`/Handlebars templates. Three trigger points call it: `TasksService.update()` (assignment + phase-move, via an old-vs-new diff against the entity `BaseAbstractService.update()` already fetches) and `TaskCommentsController.create()` (comment). The frontend gains an `actorUserId` field on outgoing task-socket payloads and a deep-link click-through on the notification bell.

**Tech Stack:** NestJS + TypeORM + PostgreSQL (backend, `src/`), Angular 20 with signals (frontend, `packages/web/src/app`), Jest + `@automock/jest` (backend unit tests), Karma/Jasmine (frontend tests), Handlebars email templates via `@nestjs-modules/mailer`.

**Spec:** `docs/superpowers/specs/2026-08-19-task-lifecycle-notifications-design.md`

## Global Constraints

- Self-exclusion is uniform: the actor never notifies themselves, for any of the three triggers.
- Assignment fires only for assignees newly added in this update (diff old vs. new `taskUserAssignmentRelations`) — never re-notify existing assignees on an unrelated save.
- Comment and phase-move both notify the task's assignees + author (deduped), excluding the actor.
- Delivery is always both in-app notification + email together, never one without the other; one recipient's failure (e.g. bad email) must not block another recipient's delivery or the in-app half of its own delivery.
- Deep link target: `<FRONT_DOMAIN>/pages/tasks-list/<projectId>`.
- `actorUserId` on `CreateTaskDto`/`UpdateTaskDto` is client-supplied, unverified — consistent with `TasksGateway`'s existing weak-trust convention, not a new security guarantee.
- Node >= 22 required for backend commands: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 22.22.2` before any `npm run test:unit`/`npm test` invocation, if the active `node -v` isn't already 22.x.
- Backend unit tests use `@automock/jest`'s `TestBed.create(Class).compile()` (auto-mocks every constructor dependency) — match the existing spec files under `test/unit/resources/tasks/`, `test/unit/resources/notifications/`, `test/unit/resources/task-comments/` for style; test files must match `*.unit.spec.ts` to run under `npm run test:unit`.
- Frontend tests mock service dependencies directly with `jasmine.createSpyObj`, per `chat.component.spec.ts` — no real providers pulled into a component spec.
- No `Co-Authored-By: Claude` trailer on commits in this repo; Conventional Commits format, no Jira prefix.

---

## Task 1: `Notification.link` column + `createForUser` link parameter

**Files:**
- Modify: `src/resources/notifications/entities/notification.entity.ts`
- Modify: `src/resources/notifications/notifications.service.ts`
- Create: `migrations/add-notifications-link-column/1787300000000-AddNotificationsLinkColumn.ts`
- Test: `test/unit/resources/notifications/notifications.service.unit.spec.ts`

**Interfaces:**
- Produces: `NotificationsService.createForUser(userId: number, title: string, message: string, link?: string | null): Promise<Notification>` — the 4th parameter is new and optional (defaults to `null`), so every existing call site (`ChatGateway.handleMessage`) keeps compiling unchanged.
- Produces: `Notification.link: string | null` — new nullable column, read by later tasks' delivery code and by the frontend (Task 7).

- [ ] **Step 1: Write the failing test**

Open `test/unit/resources/notifications/notifications.service.unit.spec.ts` and replace the existing `createForUser` describe block with:

```ts
    describe('createForUser', () => {
        it('creates an unread notification for the given user', async () => {
            const created = { id: 1, userId: 7, title: 'New message', message: 'hi', isRead: 0, link: null } as Notification;
            repository.create.mockResolvedValue(created);

            const result = await service.createForUser(7, 'New message', 'hi');

            expect(repository.create).toHaveBeenCalledWith({ userId: 7, title: 'New message', message: 'hi', isRead: 0, link: null });
            expect(result).toBe(created);
        });

        it('creates a notification with a deep link when one is given', async () => {
            const created = { id: 2, userId: 7, title: 'Assigned', message: 'hi', isRead: 0, link: 'https://crm.t-slen.com/pages/tasks-list/3' } as Notification;
            repository.create.mockResolvedValue(created);

            const result = await service.createForUser(7, 'Assigned', 'hi', 'https://crm.t-slen.com/pages/tasks-list/3');

            expect(repository.create).toHaveBeenCalledWith({
                userId: 7,
                title: 'Assigned',
                message: 'hi',
                isRead: 0,
                link: 'https://crm.t-slen.com/pages/tasks-list/3',
            });
            expect(result).toBe(created);
        });
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 22.22.2 && npm run test:unit -- notifications.service`
Expected: FAIL — `repository.create` was called with `{ userId: 7, title: 'New message', message: 'hi', isRead: 0 }` (no `link` key) which does not equal the expected object containing `link: null`, and the second test fails because `createForUser` only accepts 3 arguments today.

- [ ] **Step 3: Add the `link` column to the entity**

In `src/resources/notifications/entities/notification.entity.ts`, add after the `isRead` column:

```ts
    @Column('varchar', { name: 'link', nullable: true, length: 500 })
        link: string | null;
```

- [ ] **Step 4: Update `createForUser`**

In `src/resources/notifications/notifications.service.ts`, replace:

```ts
    createForUser (userId: number, title: string, message: string): Promise<Notification> {
        return this.repository.create({ userId, title, message, isRead: 0 });
    }
```

with:

```ts
    createForUser (userId: number, title: string, message: string, link: string | null = null): Promise<Notification> {
        return this.repository.create({ userId, title, message, isRead: 0, link });
    }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:unit -- notifications.service`
Expected: PASS

- [ ] **Step 6: Write the migration**

Create `migrations/add-notifications-link-column/1787300000000-AddNotificationsLinkColumn.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationsLinkColumn1787300000000 implements MigrationInterface {
    name = 'AddNotificationsLinkColumn1787300000000'

    public async up (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" ADD "link" varchar(500)`);
    }

    public async down (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "link"`);
    }
}
```

This is scaffolding for the entity change in Step 3 (no independent test — a raw `ALTER TABLE` has no unit-testable behavior in this codebase's existing convention; no other migration under `migrations/` has a test either). Verify it applies cleanly against a local Postgres instance if one is running: `npm run migration:run`; if no local DB is available in this environment, skip execution and note it in the commit body — the SQL is straightforward enough to review by inspection, matching how `1787200000000-AddNotificationsTable.ts` was added in this same session.

- [ ] **Step 7: Commit**

```bash
git add src/resources/notifications/entities/notification.entity.ts src/resources/notifications/notifications.service.ts migrations/add-notifications-link-column/1787300000000-AddNotificationsLinkColumn.ts test/unit/resources/notifications/notifications.service.unit.spec.ts
git commit -m "feat(notifications): add optional deep-link column to notifications"
```

---

## Task 2: `CreateTaskDto.actorUserId`

**Files:**
- Modify: `src/resources/tasks/dto/create-task.dto.ts`
- Test: `test/unit/resources/tasks/create-task.dto.unit.spec.ts` (new file, matching the pattern in `test/unit/resources/task-comments/create-task-comment.dto.unit.spec.ts`)

**Interfaces:**
- Produces: `CreateTaskDto.actorUserId: number | null` — optional, validated as an int when present. Inherited by `UpdateTaskDto` (`PartialType(CreateTaskDto)`) and by `multiReordering`'s `CreateTaskDto[]` payload.

- [ ] **Step 1: Write the failing test**

Create `test/unit/resources/tasks/create-task.dto.unit.spec.ts`:

```ts
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTaskDto } from '../../../../src/resources/tasks/dto/create-task.dto';

describe('CreateTaskDto', () => {
    it('accepts a payload with no actorUserId', async () => {
        const dto = plainToInstance(CreateTaskDto, { title: 'test' });

        const errors = await validate(dto);

        expect(errors.some((e) => e.property === 'actorUserId')).toBe(false);
    });

    it('accepts a payload with an integer actorUserId', async () => {
        const dto = plainToInstance(CreateTaskDto, { title: 'test', actorUserId: 7 });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.actorUserId).toBe(7);
    });

    it('rejects a non-integer actorUserId', async () => {
        const dto = plainToInstance(CreateTaskDto, { title: 'test', actorUserId: 'not-a-number' });

        const errors = await validate(dto);

        expect(errors.some((e) => e.property === 'actorUserId')).toBe(true);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- create-task.dto`
Expected: FAIL — `actorUserId` doesn't exist on `CreateTaskDto`, so `dto.actorUserId` is `undefined` (second test's `toBe(7)` assertion fails) and the third test finds no validation error for a property that isn't defined on the class.

- [ ] **Step 3: Add the field**

In `src/resources/tasks/dto/create-task.dto.ts`, add after the `orderId` field:

```ts
    @IsOptional()
    @IsInt()
        actorUserId: number | null;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- create-task.dto`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/resources/tasks/dto/create-task.dto.ts test/unit/resources/tasks/create-task.dto.unit.spec.ts
git commit -m "feat(tasks): accept client-supplied actorUserId on task create/update"
```

---

## Task 3: `TaskNotificationsService` + `TaskNotificationsModule` + email templates

**Files:**
- Create: `src/resources/tasks/task-notifications.service.ts`
- Create: `src/resources/tasks/task-notifications.module.ts`
- Create: `src/common/services/mail/templates/task.assigned.hbs`
- Create: `src/common/services/mail/templates/task.commented.hbs`
- Create: `src/common/services/mail/templates/task.phase-moved.hbs`
- Test: `test/unit/resources/tasks/task-notifications.service.unit.spec.ts`

**Interfaces:**
- Consumes: `NotificationsService.createForUser(userId, title, message, link?)` (Task 1), `LiveKitGateway.notifyUser(userId: number, payload: unknown): void` (existing), `MailService.sendMail(options: ISendMailOptions): Promise<string>` (existing).
- Produces:
  - `TaskNotificationsService.notifyAssigned(task: Tasks, newAssignees: Users[], actor: Users | null): Promise<void>`
  - `TaskNotificationsService.notifyCommented(task: Tasks, commentContent: string, commenter: Users, recipients: Users[]): Promise<void>`
  - `TaskNotificationsService.notifyPhaseMoved(task: Tasks, fromPhaseName: string, toPhaseName: string, recipients: Users[], actor: Users | null): Promise<void>`
  - `TaskNotificationsModule` exporting `TaskNotificationsService`, consumed by Task 4 and Task 5.

- [ ] **Step 1: Write the failing test**

Create `test/unit/resources/tasks/task-notifications.service.unit.spec.ts`:

```ts
import { TestBed } from '@automock/jest';
import { ConfigService } from '@nestjs/config';
import { TaskNotificationsService } from '../../../../src/resources/tasks/task-notifications.service';
import { NotificationsService } from '../../../../src/resources/notifications/notifications.service';
import { MailService } from '../../../../src/common/services/mail/mail.service';
import { LiveKitGateway } from '../../../../src/resources/live-kit/gateway/live-kit.gateway';
import { Tasks } from '../../../../src/resources/tasks/entities/task.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { Notification } from '../../../../src/resources/notifications/entities/notification.entity';

describe('TaskNotificationsService', () => {
    let service: TaskNotificationsService;
    let notificationsService: jest.Mocked<NotificationsService>;
    let mailService: jest.Mocked<MailService>;
    let liveKitGateway: jest.Mocked<LiveKitGateway>;
    let configService: jest.Mocked<ConfigService>;

    const task = { id: 1, title: 'Ship it', projectId: 3 } as Tasks;
    const actor = { id: 1, firstName: 'Ann', lastName: 'Actor', email: 'ann@example.com' } as Users;
    const assignee = { id: 2, firstName: 'Bob', lastName: 'Assignee', email: 'bob@example.com' } as Users;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(TaskNotificationsService).compile();
        service = unit;
        notificationsService = unitRef.get(NotificationsService);
        mailService = unitRef.get(MailService);
        liveKitGateway = unitRef.get(LiveKitGateway);
        configService = unitRef.get(ConfigService);
        configService.get.mockReturnValue('https://crm.t-slen.com');
        notificationsService.createForUser.mockResolvedValue({ id: 99 } as Notification);
    });

    describe('notifyAssigned', () => {
        it('delivers an in-app notification and email to each new assignee', async () => {
            await service.notifyAssigned(task, [assignee], actor);

            expect(notificationsService.createForUser).toHaveBeenCalledWith(
                2, 'You were assigned a task', 'Ann Actor assigned you to "Ship it"', 'https://crm.t-slen.com/pages/tasks-list/3',
            );
            expect(liveKitGateway.notifyUser).toHaveBeenCalledWith(2, { id: 99 });
            expect(mailService.sendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'bob@example.com',
                template: './task.assigned.hbs',
            }));
        });

        it('excludes the actor from their own assignment notification', async () => {
            await service.notifyAssigned(task, [actor], actor);

            expect(notificationsService.createForUser).not.toHaveBeenCalled();
            expect(mailService.sendMail).not.toHaveBeenCalled();
        });

        it('still emails the in-app-eligible recipients when one delivery throws', async () => {
            const secondAssignee = { id: 5, firstName: 'Cara', lastName: 'C', email: 'cara@example.com' } as Users;
            notificationsService.createForUser
                .mockRejectedValueOnce(new Error('db down'))
                .mockResolvedValueOnce({ id: 100 } as Notification);

            await service.notifyAssigned(task, [assignee, secondAssignee], actor);

            expect(mailService.sendMail).toHaveBeenCalledTimes(2);
            expect(liveKitGateway.notifyUser).toHaveBeenCalledWith(5, { id: 100 });
        });
    });

    describe('notifyCommented', () => {
        it('excludes the commenter from the recipient list', async () => {
            await service.notifyCommented(task, 'nice work', actor, [actor, assignee]);

            expect(notificationsService.createForUser).toHaveBeenCalledTimes(1);
            expect(mailService.sendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'bob@example.com',
                template: './task.commented.hbs',
            }));
        });
    });

    describe('notifyPhaseMoved', () => {
        it('excludes the actor and notifies the remaining recipients', async () => {
            await service.notifyPhaseMoved(task, 'To Do', 'In Progress', [actor, assignee], actor);

            expect(notificationsService.createForUser).toHaveBeenCalledTimes(1);
            expect(mailService.sendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'bob@example.com',
                template: './task.phase-moved.hbs',
                context: expect.objectContaining({ fromPhaseName: 'To Do', toPhaseName: 'In Progress' }),
            }));
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- task-notifications.service`
Expected: FAIL with a module-not-found error — `src/resources/tasks/task-notifications.service.ts` doesn't exist yet.

- [ ] **Step 3: Write the service**

Create `src/resources/tasks/task-notifications.service.ts`:

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
        const frontDomain = this.configService.get('FRONT_DOMAIN');
        return `${frontDomain}/pages/tasks-list/${task.projectId}`;
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- task-notifications.service`
Expected: PASS

- [ ] **Step 5: Add the email templates**

Create `src/common/services/mail/templates/task.assigned.hbs`:

```hbs
<p>Hi {{ recipient.firstName }},</p>
<p>{{#if actor}}{{ actor.firstName }} {{ actor.lastName }}{{else}}Someone{{/if}} assigned you to a task: <strong>{{ task.title }}</strong>.</p>
<p><a style="color:#1b73e7" href="{{ link }}">View task</a></p>
```

Create `src/common/services/mail/templates/task.commented.hbs`:

```hbs
<p>Hi {{ recipient.firstName }},</p>
<p>{{ commenter.firstName }} {{ commenter.lastName }} commented on <strong>{{ task.title }}</strong>:</p>
<p>{{ commentContent }}</p>
<p><a style="color:#1b73e7" href="{{ link }}">View task</a></p>
```

Create `src/common/services/mail/templates/task.phase-moved.hbs`:

```hbs
<p>Hi {{ recipient.firstName }},</p>
<p><strong>{{ task.title }}</strong> was moved from {{ fromPhaseName }} to {{ toPhaseName }}{{#if actor}} by {{ actor.firstName }} {{ actor.lastName }}{{/if}}.</p>
<p><a style="color:#1b73e7" href="{{ link }}">View task</a></p>
```

No test needed for the templates themselves — `MailService.sendMail` is mocked in every test that exercises `TaskNotificationsService` (Step 1's test, plus Tasks 4 and 5), so the templates are exercised for real only when actually sending mail, matching this codebase's existing convention (no test coverage exists for `approve.request.hbs`/`approve.answer.hbs` either).

- [ ] **Step 6: Write the module**

Create `src/resources/tasks/task-notifications.module.ts`:

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

- [ ] **Step 7: Commit**

```bash
git add src/resources/tasks/task-notifications.service.ts src/resources/tasks/task-notifications.module.ts src/common/services/mail/templates/task.assigned.hbs src/common/services/mail/templates/task.commented.hbs src/common/services/mail/templates/task.phase-moved.hbs test/unit/resources/tasks/task-notifications.service.unit.spec.ts
git commit -m "feat(tasks): add TaskNotificationsService for assigned/commented/phase-moved delivery"
```

---

## Task 4: `TasksService.update()` — assignment + phase-move triggers

**Files:**
- Modify: `src/resources/tasks/tasks.service.ts`
- Modify: `src/resources/tasks/tasks.module.ts`
- Test: `test/unit/resources/tasks/tasks.service.unit.spec.ts`

**Interfaces:**
- Consumes: `TaskNotificationsService.notifyAssigned`/`notifyPhaseMoved` (Task 3), `UsersService.findOneById(id, user): Promise<Users>` (existing, inherited from `BaseAbstractService`), `TaskPhaseRepository.findOne(id): Promise<TaskPhase>` (existing, inherited from `BaseAbstractRepository`), `CreateTaskDto.actorUserId` (Task 2).
- Produces: `TasksService.collectTaskRecipients(task: Tasks): Promise<Users[]>` — non-private, consumed by Task 5.

**Note on the spec:** the design doc (§5.1) named `TaskPhaseService` as the phase-lookup dependency. `TaskPhaseModule` only exports `TaskPhaseRepository`, not `TaskPhaseService` (see `src/resources/task-phase/task-phase.module.ts`) — `TaskPhaseRepository.findOne(id)` is the exported, equivalent call (`TaskPhaseService` adds no behavior beyond the base class), so this task uses the repository directly instead of widening `TaskPhaseModule`'s public surface.

- [ ] **Step 1: Write the failing test**

Replace the full contents of `test/unit/resources/tasks/tasks.service.unit.spec.ts` with:

```ts
import { TestBed } from '@automock/jest';
import { TasksService } from '../../../../src/resources/tasks/tasks.service';
import { TasksRepository } from '../../../../src/resources/tasks/tasks.repository';
import { TaskNotificationsService } from '../../../../src/resources/tasks/task-notifications.service';
import { TaskPhaseRepository } from '../../../../src/resources/task-phase/task-phase.repository';
import { UsersService } from '../../../../src/resources/users/users.service';
import { mockedTask } from '../../../shared/task';
import { Tasks } from '../../../../src/resources/tasks/entities/task.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { TaskPhase } from '../../../../src/resources/task-phase/entities/task-phase.entity';
import { CreateTaskDto } from '../../../../src/resources/tasks/dto/create-task.dto';

describe('TasksService', () => {
    let service: TasksService;
    let repository: jest.Mocked<TasksRepository>;
    let taskNotificationsService: jest.Mocked<TaskNotificationsService>;
    let taskPhaseRepository: jest.Mocked<TaskPhaseRepository>;
    let usersService: jest.Mocked<UsersService>;

    const actor = { id: 1, firstName: 'Ann', lastName: 'Actor' } as Users;
    const existingAssignee = { id: 2 } as Users;
    const newAssignee = { id: 3 } as Users;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(TasksService).compile();
        service = unit;
        repository = unitRef.get(TasksRepository);
        taskNotificationsService = unitRef.get(TaskNotificationsService);
        taskPhaseRepository = unitRef.get(TaskPhaseRepository);
        usersService = unitRef.get(UsersService);
        usersService.findOneById.mockResolvedValue(actor);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should call multiReordering', async () => {
        const mockResponse = [mockedTask];
        jest.spyOn(service, 'multiReordering').mockResolvedValue(mockResponse as Tasks[]);
        const result = await service.multiReordering([]);
        expect(service.multiReordering).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });

    describe('update', () => {
        it('notifies only the newly added assignees, excluding the actor', async () => {
            const before = {
                id: 1, phaseId: 1, projectId: 1,
                taskUserAssignmentRelations: [{ userId: 2, user: existingAssignee }],
            } as Tasks;
            const after = {
                id: 1, phaseId: 1, projectId: 1, title: 'Ship it',
                taskUserAssignmentRelations: [
                    { userId: 2, user: existingAssignee },
                    { userId: 3, user: newAssignee },
                ],
            } as Tasks;
            repository.findOne.mockResolvedValue(before);
            repository.updateOneWithRelations.mockResolvedValue(after);

            await service.update(1, { actorUserId: 1, phaseId: 1 } as CreateTaskDto);

            expect(taskNotificationsService.notifyAssigned).toHaveBeenCalledWith(after, [newAssignee], actor);
        });

        it('does not fire an assignment notification when the assignee list is unchanged', async () => {
            const before = {
                id: 1, phaseId: 1, projectId: 1,
                taskUserAssignmentRelations: [{ userId: 2, user: existingAssignee }],
            } as Tasks;
            const after = { ...before, title: 'Renamed' } as Tasks;
            repository.findOne.mockResolvedValue(before);
            repository.updateOneWithRelations.mockResolvedValue(after);

            await service.update(1, { actorUserId: 1 } as CreateTaskDto);

            expect(taskNotificationsService.notifyAssigned).not.toHaveBeenCalled();
        });

        it('notifies assignees and author on a phase move, excluding the actor', async () => {
            const before = {
                id: 1, phaseId: 1, projectId: 1, createdBy: '1',
                taskUserAssignmentRelations: [{ userId: 2, user: existingAssignee }],
            } as Tasks;
            const after = { ...before, phaseId: 2 } as Tasks;
            repository.findOne.mockResolvedValue(before);
            repository.updateOneWithRelations.mockResolvedValue(after);
            taskPhaseRepository.findOne
                .mockResolvedValueOnce({ id: 1, name: 'To Do' } as TaskPhase)
                .mockResolvedValueOnce({ id: 2, name: 'In Progress' } as TaskPhase);

            await service.update(1, { actorUserId: 1, phaseId: 2 } as CreateTaskDto);

            expect(taskNotificationsService.notifyPhaseMoved).toHaveBeenCalledWith(
                after, 'To Do', 'In Progress', [existingAssignee], actor,
            );
        });

        it('does not fire a phase-move notification when phaseId is unchanged', async () => {
            const before = {
                id: 1, phaseId: 1, projectId: 1,
                taskUserAssignmentRelations: [],
            } as Tasks;
            const after = { ...before, title: 'Renamed' } as Tasks;
            repository.findOne.mockResolvedValue(before);
            repository.updateOneWithRelations.mockResolvedValue(after);

            await service.update(1, { actorUserId: 1, phaseId: 1 } as CreateTaskDto);

            expect(taskNotificationsService.notifyPhaseMoved).not.toHaveBeenCalled();
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tasks.service`
Expected: FAIL — `TasksService` doesn't depend on `TaskNotificationsService`/`TaskPhaseRepository` yet, so `unitRef.get(TaskNotificationsService)` throws (dependency not found in the automock graph), and `update()` is still the inherited `BaseAbstractService.update()`, which never calls `notifyAssigned`/`notifyPhaseMoved`.

- [ ] **Step 3: Implement the override**

Replace the contents of `src/resources/tasks/tasks.service.ts` with:

```ts
import { Injectable } from '@nestjs/common';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { TasksRepository } from './tasks.repository';
import { Tasks } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UploadAbstractService } from '../../common/services/upload/upload.abstract.service';
import { UsersService } from '../users/users.service';
import { Users } from '../users/entities/users.entity';
import { TaskAttachments } from './entities/task-attachments.entity';
import { ErrorExceptionMethod, ErrorService } from '../../common/services/error/error.service';
import { TaskNotificationsService } from './task-notifications.service';
import { TaskPhaseRepository } from '../task-phase/task-phase.repository';

@Injectable()
export class TasksService extends BaseAbstractService<Tasks>{
    constructor (
    protected readonly repository: TasksRepository,
    protected readonly errorService: ErrorService,
    private readonly uploadService: UploadAbstractService,
    private readonly usersService: UsersService,
    private readonly taskNotificationsService: TaskNotificationsService,
    private readonly taskPhaseRepository: TaskPhaseRepository
    ) {
        super(repository, errorService);
        this.currentRepository = repository;
    }

    async update (id: number, data: CreateTaskDto): Promise<Tasks> {
        const before: Tasks = await this.currentRepository.findOne(id);
        const oldAssigneeIds = new Set((before?.taskUserAssignmentRelations ?? []).map(r => r.userId));
        const oldPhaseId = before?.phaseId ?? null;

        const updated = await super.update(id, data) as Tasks;

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
                oldPhaseId ? this.taskPhaseRepository.findOne(oldPhaseId) : null,
                this.taskPhaseRepository.findOne(data.phaseId),
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

    async multiReordering (tasks: CreateTaskDto[]): Promise<Tasks[]> {
        return await this.currentRepository.multiReordering(tasks);
    }
    public async uploadFiles (user: Users, userId: number, files: Express.Multer.File[]): Promise<TaskAttachments[]> {
        try {
            this.usersService.validateUserIdByRole(userId, user);
            const result = [];
            for (const file of files) {
                if (!file) {
                    const errorMessage = `uploadFiles: ${this.constructor.name}. Message: File is empty`;
                    const throwError = { method: ErrorExceptionMethod.NotFound, message: `File is empty` };
                    await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
                }
                const imageUrl: string[] = await this.uploadService.uploadImage(file, 'taskAttachments/');
                const attachment = Object.assign(new TaskAttachments({}), {
                    url: imageUrl[0],
                    name: file.filename,
                    extension: file.mimetype,
                    originName: file.originalname,
                    type: file.mimetype
                });
                result.push(attachment);
            }
            return result;
        } catch (e) {
            const errorMessage = `uploadFiles: ${this.constructor.name}. Message: ${e.message}`;
            const throwError = { method: ErrorExceptionMethod.NotFound, message: `Cannot upload files` };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tasks.service`
Expected: PASS

- [ ] **Step 5: Wire the new dependencies into `TasksModule`**

In `src/resources/tasks/tasks.module.ts`, add imports for `TaskNotificationsModule` and `TaskPhaseModule`:

```ts
import { TaskNotificationsModule } from './task-notifications.module';
import { TaskPhaseModule } from '../task-phase/task-phase.module';
```

and add both to the `imports` array (alongside the existing `FirebaseModule, UsersModule`):

```ts
        FirebaseModule,
        UsersModule,
        TaskNotificationsModule,
        TaskPhaseModule
```

- [ ] **Step 6: Run the full unit suite to check for regressions**

Run: `npm run test:unit`
Expected: PASS (no regressions in `tasks.controller.unit.spec.ts`, `tasks.gateway.unit.spec.ts`, `tasks.repository.unit.spec.ts`, or elsewhere — none of them construct `TasksService` directly with a fixed argument list that the new constructor params would break, since `@automock/jest` mocks whatever the constructor declares).

- [ ] **Step 7: Commit**

```bash
git add src/resources/tasks/tasks.service.ts src/resources/tasks/tasks.module.ts test/unit/resources/tasks/tasks.service.unit.spec.ts
git commit -m "feat(tasks): notify newly-added assignees and phase-move recipients on update"
```

---

## Task 5: Comment trigger — `TaskCommentsController.create()`

**Files:**
- Modify: `src/resources/task-comments/task-comments.controller.ts`
- Modify: `src/resources/task-comments/task-comments.module.ts`
- Test: `test/unit/resources/task-comments/task-comments.controller.unit.spec.ts`

**Interfaces:**
- Consumes: `TasksService.findOneById(id, user)` (existing, inherited), `TasksService.collectTaskRecipients(task)` (Task 4), `TaskNotificationsService.notifyCommented(task, content, commenter, recipients)` (Task 3).

- [ ] **Step 1: Write the failing test**

Replace the full contents of `test/unit/resources/task-comments/task-comments.controller.unit.spec.ts` with:

```ts
import { TestBed } from '@automock/jest';
import { TaskCommentsController } from '../../../../src/resources/task-comments/task-comments.controller';
import { TaskCommentsService } from '../../../../src/resources/task-comments/task-comments.service';
import { TasksService } from '../../../../src/resources/tasks/tasks.service';
import { TaskNotificationsService } from '../../../../src/resources/tasks/task-notifications.service';
import { TaskComment } from '../../../../src/resources/tasks/entities/task-comment.entity';
import { Tasks } from '../../../../src/resources/tasks/entities/task.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { mockUser } from '../../../shared/users';

describe('TaskCommentsController', () => {
    let controller: TaskCommentsController;
    let service: jest.Mocked<TaskCommentsService>;
    let tasksService: jest.Mocked<TasksService>;
    let taskNotificationsService: jest.Mocked<TaskNotificationsService>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(TaskCommentsController).compile();
        controller = unit;
        service = unitRef.get(TaskCommentsService);
        tasksService = unitRef.get(TasksService);
        taskNotificationsService = unitRef.get(TaskNotificationsService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('findAll', () => {
        it('lists comments for the given taskId via the service', async () => {
            const comments = [{ id: 1, taskId: 5, content: 'hi' }] as TaskComment[];
            service.findByTask.mockResolvedValue(comments);

            const result = await controller.findAll(5);

            expect(service.findByTask).toHaveBeenCalledWith(5);
            expect(result).toBe(comments);
        });
    });

    describe('create', () => {
        it('sets userId from the authenticated user, not the client body', async () => {
            const created = { id: 1, taskId: 5, userId: 1, content: 'hi' } as TaskComment;
            service.create.mockResolvedValue(created);
            tasksService.findOneById.mockResolvedValue(null);

            const result = await controller.create({ taskId: 5, content: 'hi' }, mockUser as Users);

            expect(service.create).toHaveBeenCalledWith({ taskId: 5, content: 'hi', userId: mockUser.id });
            expect(result).toBe(created);
        });

        it('notifies the task recipients, excluding the commenter', async () => {
            const created = { id: 1, taskId: 5, userId: 1, content: 'nice' } as TaskComment;
            const task = { id: 5, title: 'Ship it' } as Tasks;
            const recipients = [{ id: 2 } as Users];
            service.create.mockResolvedValue(created);
            tasksService.findOneById.mockResolvedValue(task);
            tasksService.collectTaskRecipients.mockResolvedValue(recipients);

            await controller.create({ taskId: 5, content: 'nice' }, mockUser as Users);

            expect(tasksService.collectTaskRecipients).toHaveBeenCalledWith(task);
            expect(taskNotificationsService.notifyCommented).toHaveBeenCalledWith(task, 'nice', mockUser, recipients);
        });

        it('does not notify when the task cannot be found', async () => {
            const created = { id: 1, taskId: 5, userId: 1, content: 'hi' } as TaskComment;
            service.create.mockResolvedValue(created);
            tasksService.findOneById.mockResolvedValue(null);

            await controller.create({ taskId: 5, content: 'hi' }, mockUser as Users);

            expect(taskNotificationsService.notifyCommented).not.toHaveBeenCalled();
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- task-comments.controller`
Expected: FAIL — `TaskCommentsController` doesn't depend on `TasksService`/`TaskNotificationsService` yet, so `unitRef.get(TasksService)` throws, and `create()` never calls `collectTaskRecipients`/`notifyCommented`.

- [ ] **Step 3: Implement the hook**

Replace the contents of `src/resources/task-comments/task-comments.controller.ts` with:

```ts
import { Body, Controller, Get, ParseIntPipe, Post, Query } from '@nestjs/common';
import { TaskCommentsService } from './task-comments.service';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { TaskComment } from '../tasks/entities/task-comment.entity';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';
import { TasksService } from '../tasks/tasks.service';
import { TaskNotificationsService } from '../tasks/task-notifications.service';

@Controller('task-comments')
export class TaskCommentsController {
    constructor (
        private readonly taskCommentsService: TaskCommentsService,
        private readonly tasksService: TasksService,
        private readonly taskNotificationsService: TaskNotificationsService,
    ) {}

    @Get()
    findAll (@Query('taskId', ParseIntPipe) taskId: number): Promise<TaskComment[]> {
        return this.taskCommentsService.findByTask(taskId);
    }

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
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- task-comments.controller`
Expected: PASS

- [ ] **Step 5: Wire the new dependencies into `TaskCommentsModule`**

Replace the contents of `src/resources/task-comments/task-comments.module.ts` with:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskCommentsService } from './task-comments.service';
import { TaskCommentsController } from './task-comments.controller';
import { TaskCommentsRepository } from './task-comments.repository';
import { TaskComment } from '../tasks/entities/task-comment.entity';
import { TasksModule } from '../tasks/tasks.module';

@Module({
    imports: [TypeOrmModule.forFeature([TaskComment]), TasksModule],
    controllers: [TaskCommentsController],
    providers: [
        TaskCommentsService,
        TaskCommentsRepository
    ],
})
export class TaskCommentsModule {}
```

`TasksModule` already exports `TasksService` (and transitively provides `TaskNotificationsService` via `TaskNotificationsModule`, imported in Task 4 — but `TaskNotificationsModule` only exports `TaskNotificationsService` to modules that import it directly, not transitively through `TasksModule`, since `TasksModule` doesn't re-export it). Add `TaskNotificationsModule` as a direct import too:

```ts
import { TaskNotificationsModule } from '../tasks/task-notifications.module';
```

and to `imports`:

```ts
    imports: [TypeOrmModule.forFeature([TaskComment]), TasksModule, TaskNotificationsModule],
```

- [ ] **Step 6: Run the full unit suite to check for regressions**

Run: `npm run test:unit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/resources/task-comments/task-comments.controller.ts src/resources/task-comments/task-comments.module.ts test/unit/resources/task-comments/task-comments.controller.unit.spec.ts
git commit -m "feat(task-comments): notify task recipients when a comment is posted"
```

---

## Task 6: Frontend — `actorUserId` on outgoing task-socket payloads

**Files:**
- Modify: `packages/web/src/app/pages/tasks-list/tasks-list.component.ts`
- Modify: `packages/web/src/app/interfaces/tasks.ts`
- Create: `packages/web/src/app/pages/tasks-list/tasks-list.component.spec.ts`

**Interfaces:**
- Produces: `ITask.actorUserId?: number` — read by the backend's `CreateTaskDto.actorUserId` (Task 2) once serialized over the `tasks` socket.

- [ ] **Step 1: Add `actorUserId` to `ITask`**

In `packages/web/src/app/interfaces/tasks.ts`, add to the `ITask` interface (alongside `phaseId`/`projectId`):

```ts
    actorUserId?: number;
```

- [ ] **Step 2: Write the failing test**

Create `packages/web/src/app/pages/tasks-list/tasks-list.component.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { TasksListComponent } from './tasks-list.component';
import { DataService } from '../../services/data.service';
import { TaskWebSocketService } from './taskWebSocket.service';
import { AuthenticationService } from '../../services/auth.service';
import { TasksListService } from './service/tasks-list.service';
import { ITask } from '../../interfaces/tasks';

describe('TasksListComponent', () => {
    let component: TasksListComponent;
    let fixture: ComponentFixture<TasksListComponent>;
    let taskWebSocketServiceSpy: jasmine.SpyObj<TaskWebSocketService>;
    let dataServiceSpy: jasmine.SpyObj<DataService>;

    beforeEach(async () => {
        taskWebSocketServiceSpy = jasmine.createSpyObj('TaskWebSocketService', ['sendMessage', 'getMessages']);
        taskWebSocketServiceSpy.getMessages.and.returnValue(new Subject().asObservable());
        dataServiceSpy = jasmine.createSpyObj('DataService', ['postData']);

        await TestBed.configureTestingModule({
            imports: [TasksListComponent, TranslateModule.forRoot()],
            providers: [
                { provide: DataService, useValue: dataServiceSpy },
                { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate'], { url: '/pages/tasks-list/1' }) },
                { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
                { provide: ActivatedRoute, useValue: { params: of({}) } },
                { provide: TaskWebSocketService, useValue: taskWebSocketServiceSpy },
                {
                    provide: AuthenticationService,
                    useValue: { authDataSignal: () => ({ id: 42 }) },
                },
                { provide: TasksListService, useValue: {} },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(TasksListComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('stamps the current user id as actorUserId when saving a new task', () => {
        const task = { id: undefined, title: 'New task' } as ITask;

        component.saveTask(task);

        expect(taskWebSocketServiceSpy.sendMessage).toHaveBeenCalledWith('create', jasmine.objectContaining({ actorUserId: 42 }));
    });

    it('stamps the current user id as actorUserId when updating a task', () => {
        const task = { id: 7, title: 'Existing task' } as ITask;

        component.updateTask(task);

        expect(taskWebSocketServiceSpy.sendMessage).toHaveBeenCalledWith('update', jasmine.objectContaining({ actorUserId: 42 }));
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run (from `packages/web/`, after `nvm use v22.22.2`): `npm test -- --include='**/tasks-list.component.spec.ts'` (see Task 7 for the headless one-off Karma setup if an interactive Chrome window isn't wanted)
Expected: FAIL — `sendMessage` is called with the raw `task` object, which has no `actorUserId` key.

- [ ] **Step 4: Stamp `actorUserId` before sending**

In `packages/web/src/app/pages/tasks-list/tasks-list.component.ts`, update `saveTask`:

```ts
  saveTask(task: ITask){
    task.url = this.router.url;
    task.actorUserId = this.authData.id;

    if (task.taskAttachments instanceof FormData) {
```

and `updateTask`:

```ts
  updateTask(task: ITask) {
    task.actorUserId = this.authData.id;

    if (task.taskAttachments instanceof FormData) {
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --include='**/tasks-list.component.spec.ts'`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/app/pages/tasks-list/tasks-list.component.ts packages/web/src/app/interfaces/tasks.ts packages/web/src/app/pages/tasks-list/tasks-list.component.spec.ts
git commit -m "feat(web): stamp the current user as actorUserId on outgoing task saves"
```

---

## Task 7: Frontend — `Notification.link` + deep-link navigation

**Files:**
- Modify: `packages/web/src/app/interfaces/notifications.ts`
- Modify: `packages/web/src/app/tslen-components/notification-bell/notification-bell.component.ts`
- Modify: `packages/web/src/app/tslen-components/notification-bell/notification-bell.component.spec.ts`

**Interfaces:**
- Consumes: `Notification.link` (Task 1, serialized from the backend).

- [ ] **Step 1: Add `link` to the `Notification` interface**

In `packages/web/src/app/interfaces/notifications.ts`:

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

- [ ] **Step 2: Read the existing bell spec to match its setup**

Read `packages/web/src/app/tslen-components/notification-bell/notification-bell.component.spec.ts` in full before editing — it already has a `TestBed` setup with spies for `DataService`, `NotificationService`, `LiveKitWebSocketService`, and `MatDialog`. The new tests below assume that existing setup is reused; add a new `describe('deep-linking', ...)` block rather than duplicating the `beforeEach`.

- [ ] **Step 3: Write the failing test**

Append to `packages/web/src/app/tslen-components/notification-bell/notification-bell.component.spec.ts` (inside the outer `describe`, using whatever spy variable names the existing `beforeEach` already assigns — e.g. if the existing file names its `Router`-equivalent navigation spy differently, add a `Router` provider spy following the same pattern used for the other existing spies):

```ts
    describe('deep-linking', () => {
        it('navigates to the notification link and does not open the dialog when a link is present', () => {
            const notification = { id: 1, title: 't', message: 'm', isRead: 1, link: 'https://crm.t-slen.com/pages/tasks-list/3' };

            component.openNotification(notification as any);

            expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/pages/tasks-list/3');
            expect(dialogSpy.open).not.toHaveBeenCalled();
        });

        it('falls back to the dialog when there is no link', () => {
            const notification = { id: 2, title: 't', message: 'm', isRead: 1 };

            component.openNotification(notification as any);

            expect(dialogSpy.open).toHaveBeenCalled();
        });
    });
```

(`routerSpy`/`dialogSpy` — use this file's existing spy variable names for the `MatDialog` mock, and add a `Router` spy with `jasmine.createSpyObj('Router', ['navigateByUrl'])` provided via `{ provide: Router, useValue: routerSpy }` in the `TestBed.configureTestingModule` providers array, matching how the other mocked dependencies are already provided in this file's `beforeEach`.)

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- --include='**/notification-bell.component.spec.ts'`
Expected: FAIL — `openNotification` never calls `router.navigateByUrl`; `Router` isn't injected yet.

- [ ] **Step 5: Implement navigation**

In `packages/web/src/app/tslen-components/notification-bell/notification-bell.component.ts`, add the `Router` import and injection:

```ts
import { Router } from '@angular/router';
```

```ts
    private router = inject(Router);
```

Replace the end of `openNotification`:

```ts
    openNotification(notification: Notification): void {
        if (notification.isRead === 0) {
            this.dataService.updateData('/notifications/', notification.id, { isRead: 1 })
                .pipe(take(1))
                .subscribe(() => {
                    const updatedNotifications = this.notificationService.notifications.value.map((item: Notification) => {
                        if (item.id === notification.id) {
                            return { ...item, isRead: 1 };
                        }
                        return item;
                    });
                    this.notificationService.notifications.next(updatedNotifications);
                });
            const currentCount = this.notificationService.countUnreadNotifications.value;
            const newCount = currentCount - 1;
            this.notificationService.countUnreadNotifications.next(newCount === 0 ? null : newCount);
        }
        if (notification.link) {
            this.router.navigateByUrl(notification.link.replace(/^https?:\/\/[^/]+/, ''));
        } else {
            this.openDialog(notification);
        }
    }
```

Also thread `link` through both places that build `Notifications` from raw payloads — in `getNotifications()`:

```ts
                    return {
                        id: item.id,
                        title: item.title,
                        message: item.message,
                        time: this.notificationService.timeSince(new Date(), new Date(item.createdAt)),
                        isRead: item.isRead,
                        link: item.link,
                    };
```

and in the live-notification handler inside `ngOnInit()`:

```ts
                    const updatedNotifications = [{
                        id: notification.id,
                        title: notification.title,
                        message: notification.message,
                        time: this.notificationService.timeSince(new Date(), new Date(notification.createdAt)),
                        isRead: notification.isRead,
                        link: notification.link,
                    }, ...this.notificationService.notifications.value];
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- --include='**/notification-bell.component.spec.ts'`
Expected: PASS

- [ ] **Step 7: Run the full frontend suite to check for regressions**

Run: `npm test` (from `packages/web/`) — recall from `AGENTS.md` that a handful of pre-existing, unrelated spec files (`ag-grid-table`, `dash-analytics`, a couple of directive specs) are already broken; a failure isolated to one of those is not a regression from this change. If unsure whether a given failure is pre-existing, `git stash` and re-run to compare.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/app/interfaces/notifications.ts packages/web/src/app/tslen-components/notification-bell/notification-bell.component.ts packages/web/src/app/tslen-components/notification-bell/notification-bell.component.spec.ts
git commit -m "feat(web): deep-link task notifications to the task's board"
```

---

## Final Verification

After all 7 tasks are committed:

- [ ] Run the full backend unit suite: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 22.22.2 && npm run test:unit`. Expected: PASS.
- [ ] Run the backend build to catch any TypeScript/module-wiring errors the unit tests (which mock dependencies) wouldn't surface: `npm run build` (or `nest build`, per `package.json`'s `build` script). Expected: clean build — this is the step that would catch a missed module import (e.g. `TaskPhaseModule` not imported into `TasksModule`).
- [ ] Run the full frontend suite from `packages/web/`: `npm test`. Expected: PASS except the pre-existing unrelated failures noted in Task 7, Step 7.
- [ ] Manually smoke-test against a running local stack (per `AGENTS.md`'s "For UI or frontend changes, start the dev server..." guidance): assign a task to another user, comment on a task as a non-assignee, and move a task between phases — confirm each produces exactly one in-app notification per affected recipient (not the actor) and that clicking the bell entry navigates to that task's board.
