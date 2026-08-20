# Global Chat Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A chat message creates a persisted, per-recipient notification that's pushed live (regardless of which page the recipient is on), and the existing-but-dead nav bell becomes real, extracted into a shared component used in both the top nav and a new left-nav entry.

**Architecture:** A new general-purpose `NotificationsModule` (entity/repository/service/controller) backs the routes the frontend already calls. `ChatGateway` derives the recipient from the 1:1 `chatRoomId` and creates a notification, then pushes it live through the *existing* always-on `LiveKitGateway`/`LiveKitWebSocketService` socket pair (extended with one new event) rather than building new socket infrastructure. The frontend's dead bell logic in `nav-right.component.ts` is extracted into a standalone `NotificationBellComponent`, used in both the top nav and a new left-nav slot.

**Tech Stack:** NestJS + TypeORM + PostgreSQL (backend), Angular 20 signals + socket.io-client (frontend), Jest (backend tests), Karma/Jasmine (frontend tests).

**Spec:** `docs/superpowers/specs/2026-08-19-global-chat-notifications-design.md`

## Global Constraints

- `Notification.isRead` is a `number` (0/1), not a boolean — matches the frontend's existing `Notification` interface and other 0/1 flags in this codebase (e.g. `isActive`).
- Chat rooms are 1:1 only; `chatRoomId` is `` `${min(userIdA,userIdB)}_${max(userIdA,userIdB)}` `` — the recipient is derived by parsing this string, not from a rooms/membership table (none exists).
- No new socket/gateway infrastructure — reuse `LiveKitGateway`'s existing `users: Map` and `LiveKitWebSocketService`'s existing always-on connection.
- `NotificationsController` routes must match the frontend's existing (currently dead) calls exactly — no frontend route-path changes needed, only un-commenting/wiring.
- New backend components (services/repositories) follow the existing `BaseAbstractRepository`/`BaseAbstractService` pattern used by every other resource (see `ApiTokensModule` as the closest recent precedent).
- Signal inputs (`input()`), not `@Input()` decorators, for new Angular component inputs, per `AGENTS.md`.

---

### Task 1: `Notification` entity + migration

**Files:**
- Create: `src/resources/notifications/entities/notification.entity.ts`
- Create: `migrations/add-notifications-table/1787200000000-AddNotificationsTable.ts`

**Interfaces:**
- Produces: `Notification` entity — `id: number`, `userId: number`, `title: string`, `message: string`, `isRead: number` (default 0), `createdAt: Date`. Table name `notifications`.

- [ ] **Step 1: Create the entity**

`src/resources/notifications/entities/notification.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

- [ ] **Step 2: Create the migration**

`migrations/add-notifications-table/1787200000000-AddNotificationsTable.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationsTable1787200000000 implements MigrationInterface {
    name = 'AddNotificationsTable1787200000000'

    public async up (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "notifications" (
                "id" SERIAL NOT NULL,
                "userId" integer NOT NULL,
                "title" varchar(250) NOT NULL,
                "message" varchar(500) NOT NULL,
                "isRead" integer NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_notifications_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "notifications_userId_fk" ON "notifications" ("userId")`);
    }

    public async down (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "notifications_userId_fk"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
    }
}
```

- [ ] **Step 3: Verify the entity compiles**

Run (from repo root, after `nvm use v22.22.2`): `npx tsc --noEmit -p tsconfig.build.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/resources/notifications/entities/notification.entity.ts migrations/add-notifications-table/
git commit -m "feat(notifications): add Notification entity and migration"
```

---

### Task 2: `NotificationsRepository`

**Files:**
- Create: `src/resources/notifications/notifications.repository.ts`
- Test: `test/unit/resources/notifications/notifications.repository.unit.spec.ts`

**Interfaces:**
- Consumes: `Notification` entity (Task 1).
- Produces: `NotificationsRepository` — `findAllForUser(userId: number): Promise<Notification[]>`, `markManyAsRead(ids: number[]): Promise<void>`, `createMany(notifications: Partial<Notification>[]): Promise<Notification[]>`, plus the inherited `BaseAbstractRepository` methods (`findOne`, `create`, `delete`, `findAll`).

- [ ] **Step 1: Write the failing test**

`test/unit/resources/notifications/notifications.repository.unit.spec.ts`:

```typescript
import { TestBed } from '@automock/jest';
import { NotificationsRepository } from '../../../../src/resources/notifications/notifications.repository';

describe('NotificationsRepository', () => {
    let repository: NotificationsRepository;
    beforeEach(() => {
        const { unit } = TestBed.create(NotificationsRepository).compile();
        repository = unit;
    });
    it('should be defined', () => {
        expect(repository).toBeDefined();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from repo root, after `nvm use v22.22.2`): `npx jest --config test/jest-unit.json test/unit/resources/notifications/notifications.repository.unit.spec.ts`
Expected: FAIL — `Cannot find module '../../../../src/resources/notifications/notifications.repository'`.

- [ ] **Step 3: Write the implementation**

`src/resources/notifications/notifications.repository.ts`:

```typescript
import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

export class NotificationsRepository extends BaseAbstractRepository<Notification> {
    constructor (
        @InjectRepository(Notification)
        private readonly notificationsRepository: Repository<Notification>
    ) {
        super(notificationsRepository);
    }

    findAllForUser (userId: number): Promise<Notification[]> {
        return this.notificationsRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async markManyAsRead (ids: number[]): Promise<void> {
        await this.notificationsRepository.update(ids, { isRead: 1 });
    }

    createMany (notifications: Partial<Notification>[]): Promise<Notification[]> {
        return this.notificationsRepository.save(notifications);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --config test/jest-unit.json test/unit/resources/notifications/notifications.repository.unit.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/resources/notifications/notifications.repository.ts test/unit/resources/notifications/notifications.repository.unit.spec.ts
git commit -m "feat(notifications): add NotificationsRepository"
```

---

### Task 3: `NotificationsService`

**Files:**
- Create: `src/resources/notifications/notifications.service.ts`
- Test: `test/unit/resources/notifications/notifications.service.unit.spec.ts`

**Interfaces:**
- Consumes: `NotificationsRepository` (Task 2) — `findAllForUser`, `markManyAsRead`, `createMany`, and inherited `create`, `delete`, `findOne`.
- Produces: `NotificationsService extends BaseAbstractService<Notification>` — `findAllForUser(userId: number): Promise<Notification[]>`, `markManyAsRead(ids: number[]): Promise<void>`, `createBroadcast(notifications: Partial<Notification>[]): Promise<Notification[]>`, `createForUser(userId: number, title: string, message: string): Promise<Notification>`, `clearMany(ids: number[]): Promise<void>`. `createForUser` is what `ChatGateway` (Task 6) calls.

- [ ] **Step 1: Write the failing test**

`test/unit/resources/notifications/notifications.service.unit.spec.ts`:

```typescript
import { TestBed } from '@automock/jest';
import { NotificationsService } from '../../../../src/resources/notifications/notifications.service';
import { NotificationsRepository } from '../../../../src/resources/notifications/notifications.repository';
import { Notification } from '../../../../src/resources/notifications/entities/notification.entity';

describe('NotificationsService', () => {
    let service: NotificationsService;
    let repository: jest.Mocked<NotificationsRepository>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(NotificationsService).compile();
        service = unit;
        repository = unitRef.get(NotificationsRepository);
    });

    describe('findAllForUser', () => {
        it('delegates to NotificationsRepository.findAllForUser', async () => {
            const notifications = [{ id: 1 }] as Notification[];
            repository.findAllForUser.mockResolvedValue(notifications);

            const result = await service.findAllForUser(7);

            expect(repository.findAllForUser).toHaveBeenCalledWith(7);
            expect(result).toBe(notifications);
        });
    });

    describe('createForUser', () => {
        it('creates an unread notification for the given user', async () => {
            const created = { id: 1, userId: 7, title: 'New message', message: 'hi', isRead: 0 } as Notification;
            repository.create.mockResolvedValue(created);

            const result = await service.createForUser(7, 'New message', 'hi');

            expect(repository.create).toHaveBeenCalledWith({ userId: 7, title: 'New message', message: 'hi', isRead: 0 });
            expect(result).toBe(created);
        });
    });

    describe('markManyAsRead', () => {
        it('delegates to NotificationsRepository.markManyAsRead', async () => {
            await service.markManyAsRead([1, 2, 3]);

            expect(repository.markManyAsRead).toHaveBeenCalledWith([1, 2, 3]);
        });
    });

    describe('clearMany', () => {
        it('deletes each given id', async () => {
            repository.delete.mockResolvedValue(undefined as never);

            await service.clearMany([1, 2]);

            expect(repository.delete).toHaveBeenCalledWith(1);
            expect(repository.delete).toHaveBeenCalledWith(2);
        });
    });

    describe('createBroadcast', () => {
        it('delegates to NotificationsRepository.createMany', async () => {
            const notifications = [{ id: 1 }, { id: 2 }] as Notification[];
            repository.createMany.mockResolvedValue(notifications);

            const result = await service.createBroadcast([{ userId: 1, title: 't', message: 'm' }]);

            expect(repository.createMany).toHaveBeenCalledWith([{ userId: 1, title: 't', message: 'm' }]);
            expect(result).toBe(notifications);
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --config test/jest-unit.json test/unit/resources/notifications/notifications.service.unit.spec.ts`
Expected: FAIL — `Cannot find module '../../../../src/resources/notifications/notifications.service'`.

- [ ] **Step 3: Write the implementation**

`src/resources/notifications/notifications.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { NotificationsRepository } from './notifications.repository';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService extends BaseAbstractService<Notification> {
    constructor (
        protected readonly repository: NotificationsRepository
    ) {
        super(repository, null);
        this.currentRepository = repository;
    }

    findAllForUser (userId: number): Promise<Notification[]> {
        return this.repository.findAllForUser(userId);
    }

    createForUser (userId: number, title: string, message: string): Promise<Notification> {
        return this.repository.create({ userId, title, message, isRead: 0 });
    }

    markManyAsRead (ids: number[]): Promise<void> {
        return this.repository.markManyAsRead(ids);
    }

    async clearMany (ids: number[]): Promise<void> {
        for (const id of ids) {
            await this.repository.delete(id);
        }
    }

    createBroadcast (notifications: Partial<Notification>[]): Promise<Notification[]> {
        return this.repository.createMany(notifications);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --config test/jest-unit.json test/unit/resources/notifications/notifications.service.unit.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/resources/notifications/notifications.service.ts test/unit/resources/notifications/notifications.service.unit.spec.ts
git commit -m "feat(notifications): add NotificationsService"
```

---

### Task 4: `NotificationsController` + `NotificationsModule`, wired into `AppModule`

**Files:**
- Create: `src/resources/notifications/dto/create-notification.dto.ts`
- Create: `src/resources/notifications/dto/mark-as-read.dto.ts`
- Create: `src/resources/notifications/notifications.controller.ts`
- Create: `src/resources/notifications/notifications.module.ts`
- Modify: `src/app.module.ts`
- Test: `test/unit/resources/notifications/notifications.controller.unit.spec.ts`

**Interfaces:**
- Consumes: `NotificationsService` (Task 3) — `findAllForUser`, `markManyAsRead`, `clearMany`, `createBroadcast`, inherited `create`/`delete`/`findOne` (used for the single mark-as-read `PATCH` via a small inline update, see Step 3).
- Produces: routes `GET /notifications`, `PATCH /notifications/:id`, `POST /notifications/mark-as-read`, `POST /notifications/clear-all`, `POST /notifications/create` — no `@UseGuards`/`@SkipAuth()` needed, JWT auth applies globally by default (matching `ApiTokensController`).

- [ ] **Step 1: Write the failing test**

`test/unit/resources/notifications/notifications.controller.unit.spec.ts`:

```typescript
import { TestBed } from '@automock/jest';
import { NotificationsController } from '../../../../src/resources/notifications/notifications.controller';
import { NotificationsService } from '../../../../src/resources/notifications/notifications.service';
import { Notification } from '../../../../src/resources/notifications/entities/notification.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { mockUser } from '../../../shared/users';

describe('NotificationsController', () => {
    let controller: NotificationsController;
    let service: jest.Mocked<NotificationsService>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(NotificationsController).compile();
        controller = unit;
        service = unitRef.get(NotificationsService);
    });

    describe('findAll', () => {
        it('returns the authenticated user\'s notifications', async () => {
            const notifications = [{ id: 1 }] as Notification[];
            service.findAllForUser.mockResolvedValue(notifications);

            const result = await controller.findAll(mockUser as Users);

            expect(service.findAllForUser).toHaveBeenCalledWith(mockUser.id);
            expect(result).toBe(notifications);
        });
    });

    describe('markOneAsRead', () => {
        it('marks a single notification as read', async () => {
            await controller.markOneAsRead(5, { isRead: 1 });

            expect(service.markManyAsRead).toHaveBeenCalledWith([5]);
        });
    });

    describe('markAsRead', () => {
        it('marks the given ids as read', async () => {
            await controller.markAsRead([1, 2, 3]);

            expect(service.markManyAsRead).toHaveBeenCalledWith([1, 2, 3]);
        });
    });

    describe('clearAll', () => {
        it('clears the given ids', async () => {
            await controller.clearAll([1, 2]);

            expect(service.clearMany).toHaveBeenCalledWith([1, 2]);
        });
    });

    describe('createBroadcast', () => {
        it('bulk-creates the given notifications', async () => {
            const dtos = [{ userId: 1, title: 't', message: 'm', isRead: 0 }];
            const created = [{ id: 1 }] as Notification[];
            service.createBroadcast.mockResolvedValue(created);

            const result = await controller.createBroadcast(dtos as never);

            expect(service.createBroadcast).toHaveBeenCalledWith(dtos);
            expect(result).toBe(created);
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --config test/jest-unit.json test/unit/resources/notifications/notifications.controller.unit.spec.ts`
Expected: FAIL — `Cannot find module '../../../../src/resources/notifications/notifications.controller'`.

- [ ] **Step 3: Write the implementation**

`src/resources/notifications/dto/create-notification.dto.ts`:

```typescript
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
    @IsInt()
        userId: number;

    @IsString()
        title: string;

    @IsString()
        message: string;

    @IsOptional()
    @IsInt()
        isRead?: number;
}
```

`src/resources/notifications/dto/mark-as-read.dto.ts`:

```typescript
import { IsIn, IsInt } from 'class-validator';

export class MarkAsReadDto {
    @IsIn([0, 1])
        isRead: number;

    @IsInt()
        id: number;
}
```

(`id`/`isRead` above cover the single-notification `PATCH` body shape; the bulk routes take a raw `number[]`, validated by NestJS's `ParseArrayPipe` in the controller below rather than a DTO class.)

`src/resources/notifications/notifications.controller.ts`:

```typescript
import { Body, Controller, Get, ParseArrayPipe, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';
import { Notification } from './entities/notification.entity';

@Controller('notifications')
export class NotificationsController {
    constructor (private readonly notificationsService: NotificationsService) {}

    @Get()
    findAll (@User() user: Users): Promise<Notification[]> {
        return this.notificationsService.findAllForUser(user.id);
    }

    @Patch(':id')
    async markOneAsRead (
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { isRead: number },
    ): Promise<void> {
        if (body.isRead) {
            await this.notificationsService.markManyAsRead([id]);
        }
    }

    @Post('mark-as-read')
    async markAsRead (
        @Body(new ParseArrayPipe({ items: Number })) ids: number[],
    ): Promise<void> {
        await this.notificationsService.markManyAsRead(ids);
    }

    @Post('clear-all')
    async clearAll (
        @Body(new ParseArrayPipe({ items: Number })) ids: number[],
    ): Promise<void> {
        await this.notificationsService.clearMany(ids);
    }

    @Post('create')
    createBroadcast (
        @Body(new ParseArrayPipe({ items: CreateNotificationDto })) dtos: CreateNotificationDto[],
    ): Promise<Notification[]> {
        return this.notificationsService.createBroadcast(dtos);
    }
}
```

`src/resources/notifications/notifications.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { Notification } from './entities/notification.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Notification])],
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationsRepository],
    exports: [NotificationsService],
})
export class NotificationsModule {}
```

In `src/app.module.ts`, add the import and register it in the `imports` array (next to `ExternalTasksModule`):

```typescript
import { NotificationsModule } from './resources/notifications/notifications.module';
```

```typescript
        ApiTokensModule,
        ExternalTasksModule,
        NotificationsModule,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --config test/jest-unit.json test/unit/resources/notifications/notifications.controller.unit.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Verify the full backend suite and build still pass**

Run: `npm run test:unit && npx tsc --noEmit -p tsconfig.build.json`
Expected: all pass, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/resources/notifications/ src/app.module.ts test/unit/resources/notifications/notifications.controller.unit.spec.ts
git commit -m "feat(notifications): add NotificationsController and wire NotificationsModule"
```

---

### Task 5: `LiveKitGateway.notifyUser` — reusable per-user push

**Files:**
- Modify: `src/resources/live-kit/gateway/live-kit.gateway.ts`
- Test: `test/unit/resources/live-kit/live-kit.gateway.unit.spec.ts` (new — no prior unit test exists for this gateway, only an e2e one)
- Modify: `src/resources/live-kit/live-kit.module.ts`

**Interfaces:**
- Produces: `LiveKitGateway.notifyUser(userId: number, payload: unknown): void` — emits `LiveKitEvents.NOTIFICATION` to that user's registered socket if one exists; no-op (no throw) if the user isn't currently connected. `LiveKitEvents.NOTIFICATION = 'notification'` added to the existing inline `LiveKitEvents` enum in this same file. `LiveKitModule` now exports `LiveKitGateway`.

- [ ] **Step 1: Write the failing test**

`test/unit/resources/live-kit/live-kit.gateway.unit.spec.ts`:

```typescript
import { Socket } from 'socket.io';
import { LiveKitGateway, LiveKitEvents } from '../../../../src/resources/live-kit/gateway/live-kit.gateway';

describe('LiveKitGateway', () => {
    let gateway: LiveKitGateway;

    beforeEach(() => {
        gateway = new LiveKitGateway();
    });

    function fakeClient (): Socket {
        return { emit: jest.fn() } as unknown as Socket;
    }

    describe('notifyUser', () => {
        it('emits a notification event to the target user\'s registered socket', async () => {
            const client = fakeClient();
            await gateway.register({ userId: 7 }, client);

            gateway.notifyUser(7, { id: 1, title: 'New message' });

            expect(client.emit).toHaveBeenCalledWith(LiveKitEvents.NOTIFICATION, { id: 1, title: 'New message' });
        });

        it('does nothing when the target user has no registered socket', () => {
            expect(() => gateway.notifyUser(999, { id: 1 })).not.toThrow();
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --config test/jest-unit.json test/unit/resources/live-kit/live-kit.gateway.unit.spec.ts`
Expected: FAIL — `LiveKitEvents.NOTIFICATION` is `undefined`, and/or `gateway.notifyUser is not a function`.

- [ ] **Step 3: Write the implementation**

In `src/resources/live-kit/gateway/live-kit.gateway.ts`, add `NOTIFICATION` to the enum:

```typescript
export const enum LiveKitEvents  {
  REGISTER = 'register',
  INCOMING_CALL = 'incoming_call',
  CALL_ACCEPTED = 'call_accepted',
  CALL_REJECTED = 'call_rejected',
  ONLINE_USERS = 'online_users',
  NOTIFICATION = 'notification',
}
```

Widen the `users` map's key type to match how it's actually used (`register`'s `data.userId` and `notifyUser`'s `userId` are both numbers coming straight off a JSON socket payload, not strings):

```typescript
    public users: Map<number, Socket> = new Map();
```

Add the method, after `broadcastOnlineUsers`:

```typescript
    public notifyUser (userId: number, payload: unknown): void {
        const socket = this.users.get(userId);
        if (socket) {
            socket.emit(LiveKitEvents.NOTIFICATION, payload);
        }
    }
```

In `src/resources/live-kit/live-kit.module.ts`, add `exports`:

```typescript
    providers: [LiveKitGrpcService, LiveKitGateway, JwtService],
    exports: [LiveKitGateway],
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --config test/jest-unit.json test/unit/resources/live-kit/live-kit.gateway.unit.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full backend suite to confirm the `users` map type widening didn't break anything**

Run: `npm run test:unit`
Expected: all pass (the existing `live-kit.gateway.e2e.spec.ts` integration test is unaffected — it exercises the gateway over a real socket connection, where payload types are unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/resources/live-kit/gateway/live-kit.gateway.ts src/resources/live-kit/live-kit.module.ts test/unit/resources/live-kit/live-kit.gateway.unit.spec.ts
git commit -m "feat(live-kit): add notifyUser for pushing events to a specific connected user"
```

---

### Task 6: `ChatGateway` creates and pushes a notification for the recipient

**Files:**
- Modify: `src/resources/chat/chat.gateway.ts`
- Modify: `src/resources/chat/chat.module.ts`
- Modify: `test/unit/resources/chat/chat.gateway.unit.spec.ts`

**Interfaces:**
- Consumes: `NotificationsService.createForUser(userId, title, message)` (Task 3), `LiveKitGateway.notifyUser(userId, payload)` (Task 5).
- Produces: `handleMessage` now also creates a notification for whichever participant isn't the sender and pushes it live.

- [ ] **Step 1: Write the failing test**

Add to `test/unit/resources/chat/chat.gateway.unit.spec.ts` (extend the existing file — add these imports at the top and this new `describe` block; the existing `beforeEach`/tests stay as-is except `ChatGateway`'s constructor now takes two more arguments):

```typescript
import { Socket } from 'socket.io';
import { ChatGateway } from '../../../../src/resources/chat/chat.gateway';
import { MessagesService } from '../../../../src/resources/messages/messages.service';
import { NotificationsService } from '../../../../src/resources/notifications/notifications.service';
import { LiveKitGateway } from '../../../../src/resources/live-kit/gateway/live-kit.gateway';

describe('ChatGateway', () => {
    let gateway: ChatGateway;
    let messagesService: jest.Mocked<Pick<MessagesService, 'saveMessage' | 'findMessagesByRoom'>>;
    let notificationsService: jest.Mocked<Pick<NotificationsService, 'createForUser'>>;
    let liveKitGateway: jest.Mocked<Pick<LiveKitGateway, 'notifyUser'>>;
    let emittedToRoom: { room: string; event: string; payload: unknown }[];

    beforeEach(() => {
        messagesService = {
            saveMessage: jest.fn().mockResolvedValue(undefined),
            findMessagesByRoom: jest.fn().mockResolvedValue([]),
        };
        notificationsService = {
            createForUser: jest.fn().mockResolvedValue({ id: 1, userId: 9, title: 'New message', message: 'hello', isRead: 0 }),
        };
        liveKitGateway = {
            notifyUser: jest.fn(),
        };
        gateway = new ChatGateway(
            messagesService as unknown as MessagesService,
            notificationsService as unknown as NotificationsService,
            liveKitGateway as unknown as LiveKitGateway,
        );
        emittedToRoom = [];
        gateway.server = {
            to: (room: string) => ({
                emit: (event: string, payload: unknown) => emittedToRoom.push({ room, event, payload }),
            }),
        } as never;
    });

    function fakeClient (userId: string): Socket {
        return { data: { userId }, emit: jest.fn() } as unknown as Socket;
    }

    describe('handleMessage', () => {
        it('broadcasts the message straight to the room, with no Redis pub/sub in between', async () => {
            const client = fakeClient('user-1');

            await gateway.handleMessage({ chatRoomId: 'room-1', content: 'hello' }, client);

            expect(emittedToRoom).toHaveLength(1);
            expect(emittedToRoom[0].room).toBe('room-1');
            expect(emittedToRoom[0].event).toBe('message');
            expect(emittedToRoom[0].payload).toEqual(
                expect.objectContaining({ senderId: 'user-1', chatRoomId: 'room-1', content: 'hello' }),
            );
        });

        it('persists the message directly via MessagesService, with no queue in between', async () => {
            const client = fakeClient('user-1');

            await gateway.handleMessage({ chatRoomId: 'room-1', content: 'hello' }, client);

            expect(messagesService.saveMessage).toHaveBeenCalledWith(
                expect.objectContaining({ senderId: 'user-1', chatRoomId: 'room-1', content: 'hello' }),
            );
        });

        it('still broadcasts the message even if persistence fails', async () => {
            messagesService.saveMessage.mockRejectedValueOnce(new Error('db down'));
            const client = fakeClient('user-1');

            await expect(gateway.handleMessage({ chatRoomId: 'room-1', content: 'hello' }, client))
                .resolves.not.toThrow();

            expect(emittedToRoom).toHaveLength(1);
        });

        it('creates a notification for the other participant, not the sender', async () => {
            const client = fakeClient('9');

            await gateway.handleMessage({ chatRoomId: '9_15', content: 'hello there' }, client);

            expect(notificationsService.createForUser).toHaveBeenCalledWith(15, 'New message', 'hello there');
        });

        it('pushes the created notification to the recipient via LiveKitGateway', async () => {
            const client = fakeClient('9');
            const created = { id: 42, userId: 15, title: 'New message', message: 'hello there', isRead: 0 };
            notificationsService.createForUser.mockResolvedValue(created as never);

            await gateway.handleMessage({ chatRoomId: '9_15', content: 'hello there' }, client);

            expect(liveKitGateway.notifyUser).toHaveBeenCalledWith(15, created);
        });

        it('truncates a long message to 100 chars for the notification body', async () => {
            const client = fakeClient('9');
            const longContent = 'a'.repeat(150);

            await gateway.handleMessage({ chatRoomId: '9_15', content: longContent }, client);

            expect(notificationsService.createForUser).toHaveBeenCalledWith(15, 'New message', 'a'.repeat(100) + '…');
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --config test/jest-unit.json test/unit/resources/chat/chat.gateway.unit.spec.ts`
Expected: FAIL — `ChatGateway` constructor only accepts one argument today (`messagesService`), so `notificationsService`/`liveKitGateway` aren't wired in, and the new "creates a notification..." tests fail because nothing calls `createForUser`.

- [ ] **Step 3: Write the implementation**

In `src/resources/chat/chat.gateway.ts`, update the constructor and imports:

```typescript
import { MessagesService } from '../messages/messages.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LiveKitGateway } from '../live-kit/gateway/live-kit.gateway';
```

```typescript
  constructor (
    private readonly messagesService: MessagesService,
    private readonly notificationsService: NotificationsService,
    private readonly liveKitGateway: LiveKitGateway,
  ) {}
```

In `handleMessage`, after the existing `saveMessage` try/catch block, before the `messageAcknowledged` emit:

```typescript
      const recipientId = chatRoomId
          .split('_')
          .map(Number)
          .find((id) => id !== Number(senderId));
      if (recipientId) {
          const truncated = content.length > 100 ? content.slice(0, 100) + '…' : content;
          const notification = await this.notificationsService.createForUser(recipientId, 'New message', truncated);
          this.liveKitGateway.notifyUser(recipientId, notification);
      }
```

In `src/resources/chat/chat.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { MessageModule } from '../messages/message.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LiveKitModule } from '../live-kit/live-kit.module';

@Module({
    imports: [MessageModule, NotificationsModule, LiveKitModule],
    providers: [ChatGateway],
})
export class ChatModule {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --config test/jest-unit.json test/unit/resources/chat/chat.gateway.unit.spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Run the full backend suite and build**

Run: `npm run test:unit && npx tsc --noEmit -p tsconfig.build.json`
Expected: all pass, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/resources/chat/chat.gateway.ts src/resources/chat/chat.module.ts test/unit/resources/chat/chat.gateway.unit.spec.ts
git commit -m "feat(chat): create and push a live notification to the message recipient"
```

---

### Task 7: Frontend — `LiveKitWebSocketService.notification$` stream

**Files:**
- Modify: `packages/web/src/app/pages/live-kit/enum/live-kit.enum.ts`
- Modify: `packages/web/src/app/pages/live-kit/live-kitWebSocket.service.ts`
- Test: `packages/web/src/app/pages/live-kit/live-kitWebSocket.service.spec.ts` (new — no existing spec for this service)

**Interfaces:**
- Produces: `LiveKitWebSocketService.notification$: Observable<Notification>` — emits whenever the socket receives a `LiveKitEvents.NOTIFICATION` event.

- [ ] **Step 1: Write the failing test**

`packages/web/src/app/pages/live-kit/live-kitWebSocket.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { LiveKitWebSocketService } from './live-kitWebSocket.service';
import { ConfigurationService } from '../../services/ConfigurationService';
import { AuthenticationService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LiveChatService } from '../../tslen-components/live-chat/live-chat.service';
import { LiveKitEvents } from './enum/live-kit.enum';
import { of, Subject } from 'rxjs';

describe('LiveKitWebSocketService', () => {
  let service: LiveKitWebSocketService;
  let fakeSocket: { on: jasmine.Spy; handlers: Record<string, (data: unknown) => void> };

  beforeEach(() => {
    fakeSocket = {
      handlers: {},
      on: jasmine.createSpy('on').and.callFake(function (this: unknown, event: string, cb: (data: unknown) => void) {
        fakeSocket.handlers[event] = cb;
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        LiveKitWebSocketService,
        { provide: ConfigurationService, useValue: { getApiHost: () => 'http://localhost' } },
        { provide: AuthenticationService, useValue: { authDataSignal: () => ({ id: 7 }) } },
        { provide: Router, useValue: {} },
        { provide: MatDialog, useValue: {} },
        { provide: LiveChatService, useValue: {} },
      ],
    });
    service = TestBed.inject(LiveKitWebSocketService);
    (service as unknown as { socket: unknown }).socket = fakeSocket;
    (service as unknown as { registerSocketListeners: () => void }).registerSocketListeners();
  });

  it('emits on notification$ when the socket receives a notification event', (done) => {
    const payload = { id: 1, title: 'New message', message: 'hi', isRead: 0 };

    service.notification$.subscribe((received) => {
      expect(received).toEqual(payload);
      done();
    });

    fakeSocket.handlers[LiveKitEvents.NOTIFICATION](payload);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `packages/web/`, after `nvm use v22.22.2`): `npx ng test --include='**/live-kitWebSocket.service.spec.ts'`
Expected: FAIL — `service.notification$` is `undefined`, and `LiveKitEvents.NOTIFICATION` is `undefined`.

- [ ] **Step 3: Write the implementation**

In `packages/web/src/app/pages/live-kit/enum/live-kit.enum.ts`:

```typescript
export const enum LiveKitEvents {
  REGISTER = 'register',
  ONLINE_USERS = 'online_users',
  INCOMING_CALL = 'incoming_call',
  CALL_ACCEPTED = 'call_accepted',
  CALL_REJECTED = 'call_rejected',
  NOTIFICATION = 'notification'
}
```

In `packages/web/src/app/pages/live-kitWebSocket.service.ts`, add the stream (next to the existing `incomingCall` Subject) and register the listener in `registerSocketListeners()`:

```typescript
  private notification = new Subject<any>();
  public readonly notification$ = this.notification.asObservable();
```

```typescript
  private registerSocketListeners(): void {
    // ...existing listeners...
    this.socket.on(LiveKitEvents.NOTIFICATION, (data: any) => {
      this.notification.next(data);
    });
  }
```

(Exact insertion point: add the `this.socket.on(LiveKitEvents.NOTIFICATION, ...)` line inside the existing `registerSocketListeners` method, alongside its existing `this.socket.on(...)` calls for `INCOMING_CALL` etc.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test --include='**/live-kitWebSocket.service.spec.ts'`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/pages/live-kit/enum/live-kit.enum.ts packages/web/src/app/pages/live-kit/live-kitWebSocket.service.ts packages/web/src/app/pages/live-kit/live-kitWebSocket.service.spec.ts
git commit -m "feat(web): add LiveKitWebSocketService.notification\$ stream"
```

---

### Task 8: Frontend — `NotificationBellComponent` (extracted, standalone)

**Files:**
- Create: `packages/web/src/app/tslen-components/notification-bell/notification-bell.component.ts`
- Create: `packages/web/src/app/tslen-components/notification-bell/notification-bell.component.html`
- Create: `packages/web/src/app/tslen-components/notification-bell/notification-bell.component.scss`
- Test: `packages/web/src/app/tslen-components/notification-bell/notification-bell.component.spec.ts`

**Interfaces:**
- Consumes: `DataService` (`getObservableData`, `updateData`, `postData`), `NotificationService` (`timeSince`, `countUnreadNotifications`), `LiveKitWebSocketService.notification$` (Task 7), `MatDialog` + `NotificationModalComponent` (existing).
- Produces: `NotificationBellComponent` — selector `app-notification-bell`, standalone, single input `userId = input<number>()`. Used by Task 9 in both the top nav and left nav.

- [ ] **Step 1: Write the failing test**

`packages/web/src/app/tslen-components/notification-bell/notification-bell.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationBellComponent } from './notification-bell.component';
import { DataService } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';
import { LiveKitWebSocketService } from '../../pages/live-kit/live-kitWebSocket.service';

describe('NotificationBellComponent', () => {
  let fixture: ComponentFixture<NotificationBellComponent>;
  let component: NotificationBellComponent;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let notificationSubject: Subject<any>;

  const existingNotification = {
    id: 1, title: 'New message', message: 'hi', isRead: 0, createdAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    dataServiceSpy = jasmine.createSpyObj('DataService', ['getObservableData', 'updateData', 'postData']);
    dataServiceSpy.getObservableData.and.returnValue(of([existingNotification]));
    notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['timeSince', 'setCountUnreadNotifications'], {
      countUnreadNotifications: of(null),
    });
    notificationServiceSpy.timeSince.and.returnValue('5 minutes');
    notificationSubject = new Subject();

    await TestBed.configureTestingModule({
      imports: [NotificationBellComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataService, useValue: dataServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: LiveKitWebSocketService, useValue: { notification$: notificationSubject.asObservable() } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationBellComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('userId', 7);
  });

  it('loads existing notifications and computes the unread count on init', () => {
    fixture.detectChanges();

    expect(dataServiceSpy.getObservableData).toHaveBeenCalledWith('/notifications');
    expect(component.notifications.length).toBe(1);
    expect(component.unreadNotiCount).toBe(1);
  });

  it('prepends a live notification and increments the unread count when one arrives', () => {
    fixture.detectChanges();

    const live = { id: 2, title: 'New message', message: 'another one', isRead: 0, createdAt: new Date().toISOString() };
    notificationSubject.next(live);

    expect(component.notifications[0].id).toBe(2);
    expect(component.unreadNotiCount).toBe(2);
  });

  it('marks all as read and clears the unread count', () => {
    dataServiceSpy.postData.and.returnValue(of({}) as never);
    fixture.detectChanges();

    component.markAsRead();

    expect(dataServiceSpy.postData).toHaveBeenCalledWith('/notifications/mark-as-read', [1]);
    expect(component.unreadNotiCount).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --include='**/notification-bell.component.spec.ts'`
Expected: FAIL — module `./notification-bell.component` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

`packages/web/src/app/tslen-components/notification-bell/notification-bell.component.ts`:

```typescript
import { Component, inject, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { map, take } from 'rxjs';
import { DataService } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';
import { LiveKitWebSocketService } from '../../pages/live-kit/live-kitWebSocket.service';
import { Notification, Notifications } from '../../interfaces/notifications';
import { NotificationModalComponent } from '../../theme/shared/components/notification-modal/notification-modal-component/notification-modal.component';

@Component({
    selector: 'app-notification-bell',
    standalone: true,
    imports: [CommonModule, MatBadgeModule, MatMenuModule, TranslateModule],
    templateUrl: './notification-bell.component.html',
    styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent implements OnInit {
    public userId = input<number>();

    public notifications: Notifications = [];
    public unreadNotiCount: number = null;
    private today = new Date();

    private dataService = inject(DataService);
    private notificationService = inject(NotificationService);
    private liveKitWebSocketService = inject(LiveKitWebSocketService);
    private dialog = inject(MatDialog);

    ngOnInit(): void {
        this.getNotifications();
        this.liveKitWebSocketService.notification$.subscribe((notification: Notification) => {
            this.notifications = [{
                id: notification.id,
                title: notification.title,
                message: notification.message,
                time: this.notificationService.timeSince(this.today, new Date(notification.createdAt)),
                isRead: notification.isRead,
            }, ...this.notifications];
            this.unreadNotiCount = (this.unreadNotiCount || 0) + 1;
        });
    }

    getNotifications(): void {
        let unreadCount = 0;
        this.dataService.getObservableData('/notifications')
            .pipe(
                map((r: any) => r.map((item: any) => {
                    if (item.isRead === 0) {
                        unreadCount++;
                    }
                    return {
                        id: item.id,
                        title: item.title,
                        message: item.message,
                        time: this.notificationService.timeSince(this.today, new Date(item.createdAt)),
                        isRead: item.isRead,
                    };
                })),
                take(1),
            )
            .subscribe((notifications: Notifications) => {
                this.unreadNotiCount = unreadCount === 0 ? null : unreadCount;
                this.notifications = notifications;
            });
    }

    openNotification(notification: Notification): void {
        if (notification.isRead === 0) {
            this.dataService.updateData('/notifications/', notification.id, { isRead: 1 })
                .pipe(take(1))
                .subscribe(() => {
                    this.notifications = this.notifications.map((item: Notification) => {
                        if (item.id === notification.id) {
                            item.isRead = 1;
                        }
                        return item;
                    });
                });
            this.unreadNotiCount = this.unreadNotiCount - 1;
            if (this.unreadNotiCount === 0) {
                this.unreadNotiCount = null;
            }
        }
        this.openDialog(notification);
    }

    openDialog(notification: Notification): void {
        this.dialog.open(NotificationModalComponent, {
            width: '50%',
            position: {},
            data: {
                title: notification.title,
                message: notification.message,
                time: notification.time,
            },
        });
    }

    markAsRead(): void {
        const notificationsIds = this.notifications.reduce((ids: number[], item: Notification) => {
            if (item.isRead === 0) {
                ids.push(item.id);
            }
            return ids;
        }, []);
        if (notificationsIds.length > 0) {
            this.dataService.postData('/notifications/mark-as-read', notificationsIds)
                .pipe(take(1))
                .subscribe(() => {
                    this.unreadNotiCount = null;
                    this.notifications = this.notifications.map((item: Notification) => {
                        item.isRead = 1;
                        return item;
                    });
                });
        }
    }

    clearAll(): void {
        const notificationsIds = this.notifications.reduce((ids: number[], item: Notification) => {
            ids.push(item.id);
            return ids;
        }, []);
        if (notificationsIds.length > 0) {
            this.dataService.postData('/notifications/clear-all', notificationsIds)
                .pipe(take(1))
                .subscribe(() => {
                    this.unreadNotiCount = null;
                    this.notifications = [];
                });
        }
    }
}
```

`packages/web/src/app/tslen-components/notification-bell/notification-bell.component.html` (moved verbatim from the `<li id="notifications">...</li>` block in `nav-right.component.html`, `[matBadge]="unreadNotiCount"` etc. unchanged):

```html
<div id="notifications">
    <a href="javascript:">
        <i class="icon feather icon-bell to-fix-jump-mat-badge"
           [matBadge]="unreadNotiCount"
           [matBadgeHidden]="!unreadNotiCount"
           matBadgeColor="accent"
           matBadgeSize="small"
           [matMenuTriggerFor]="menu"
        ></i>
    </a>
    <div>
        <mat-menu #menu="matMenu" backdropClass="noti-mat-menu">
            <div class="noti-head-mat-menu">
                <h6 class="d-inline-block m-b-0">{{'menu.notifications.title'| translate}}</h6>
                <div class="float-right">
                    <a href="javascript:" class="m-r-10" (click)="markAsRead()">{{'menu.notifications.link.mark_read'| translate}}</a>
                    <a href="javascript:" class="m-r-10" (click)="clearAll()">{{'menu.notifications.link.clear_all'| translate}}</a>
                </div>
            </div>
            <div *ngFor="let notification of notifications">
                <div mat-menu-item class="one-notification" (click)="openNotification(notification)">
                    <span [ngClass]="notification.isRead ? 'dot-none': 'dot'"></span>
                    <div class="notification-body">
                        <span class="notification-title">
                            <strong>{{notification.title}}</strong>
                            &nbsp;
                            <span class="text-muted">{{notification.time}}</span>
                        </span>
                        <span class="noti-message">{{notification.message}}</span>
                    </div>
                </div>
            </div>
            <div *ngIf="notifications && notifications.length === 0"
                 mat-menu-item
                 class="one-notification">
                <div>
                    <div>
                        <span>{{'menu.notifications.no_notifications'| translate}}</span>
                    </div>
                </div>
            </div>
        </mat-menu>
    </div>
</div>
```

`packages/web/src/app/tslen-components/notification-bell/notification-bell.component.scss` (the notification-specific rules from `nav-right.component.scss`, moving with the markup that uses them — `.custom-select` stays behind in `nav-right.component.scss`, it styles the unrelated language `<select>`):

```scss
.to-fix-jump-mat-badge {
  display: inline-block;
}
.one-notification {
  height: auto;
  line-height: 20px;
  padding-bottom: 10px;
  padding-top: 10px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
}
.notification-body {
  display: flex;
  flex-direction: column;
}
.notification-title {
}
.noti-message {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 310px;
}
.noti-head-mat-menu {
  padding: 15px 20px;

  a {
    text-decoration: underline;
    font-size: 13px;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test --include='**/notification-bell.component.spec.ts'`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/tslen-components/notification-bell/
git commit -m "feat(web): extract NotificationBellComponent from nav-right"
```

---

### Task 9: Wire `NotificationBellComponent` into the top nav and left nav

**Files:**
- Modify: `packages/web/src/app/app.module.ts`
- Modify: `packages/web/src/app/theme/layout/admin/nav-bar/nav-right/nav-right.component.html`
- Modify: `packages/web/src/app/theme/layout/admin/nav-bar/nav-right/nav-right.component.ts`
- Modify: `packages/web/src/app/theme/layout/admin/nav-bar/nav-right/nav-right.component.scss`
- Modify: `packages/web/src/app/theme/layout/admin/navigation/nav-content/nav-content.component.html`

**Interfaces:**
- Consumes: `NotificationBellComponent` (Task 8), `nav-content.component.ts`'s existing `public userId: number`.

- [ ] **Step 1: Import the standalone component into `AppModule`**

In `packages/web/src/app/app.module.ts`, add the import and add it to the `imports` array (it declares both `NavRightComponent` and `NavContentComponent`, so importing it once here makes `<app-notification-bell>` resolvable in both their templates):

```typescript
import { NotificationBellComponent } from './tslen-components/notification-bell/notification-bell.component';
```

Add `NotificationBellComponent` to the existing `@NgModule({ imports: [...] })` array.

- [ ] **Step 2: Replace the inline bell markup in the top nav**

In `packages/web/src/app/theme/layout/admin/nav-bar/nav-right/nav-right.component.html`, replace the entire `<li><div id="notifications">...</div></li>` block with:

```html
    <li>
        <app-notification-bell [userId]="userId"></app-notification-bell>
    </li>
```

- [ ] **Step 3: Remove the now-dead notification fields/methods from `NavRightComponent`**

In `packages/web/src/app/theme/layout/admin/nav-bar/nav-right/nav-right.component.ts`, remove: the `Notifications`/`Notification` imports, the `NotificationService`/`DataService`/`MatDialog`/`NotificationModalComponent` imports and constructor params that are now unused by this component (check each is not still used elsewhere in the file before removing — `DataService` is still used by `ngOnInit`'s `getOneUser` call, so keep that one), the `notifications`/`unreadNotiCount` fields, and the `openNotification`/`openDialog`/`markAsRead`/`clearAll`/`getNotifications` methods (all moved to `NotificationBellComponent` in Task 8).

- [ ] **Step 4: Remove the now-unused notification styles from `nav-right.component.scss`**

Remove the `.to-fix-jump-mat-badge`, `.one-notification`, `.notification-body`, `.notification-title`, `.noti-message`, `.noti-head-mat-menu` rules (now living in `notification-bell.component.scss` instead — see Task 8). Leave `#nav-right-container` and `.custom-select` in place; `#nav-right-container` becomes an empty rule block once `.to-fix-jump-mat-badge` is removed from inside it — remove the now-empty `#nav-right-container {}` block too.

- [ ] **Step 5: Add the bell to the left nav**

In `packages/web/src/app/theme/layout/admin/navigation/nav-content/nav-content.component.html`, replace the commented-out `dark-mode-button` block with:

```html
        <li class="notification-bell-nav">
            <app-notification-bell [userId]="userId"></app-notification-bell>
        </li>
```

- [ ] **Step 6: Build and run the full frontend spec suite**

Run (from `packages/web/`, after `nvm use v22.22.2`): `npx ng build && npx ng test --watch=false` (or the project's one-off headless Karma config if already set up in this environment)
Expected: clean build, all specs pass — including the full pre-existing suite (no regression from removing the inline bell markup/fields).

- [ ] **Step 7: Manual verification**

Start the backend (`npm run start:dev`) and frontend (`ng serve`), log in as two different users in two browser sessions (or one normal + one incognito), open a 1:1 chat between them via the live-kit page as one user, send a message, and confirm the *other* user sees the bell badge update in both the top nav and left nav while sitting on a completely different page (e.g. the main wall) — not the chat page.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/app/app.module.ts packages/web/src/app/theme/layout/admin/nav-bar/nav-right/ packages/web/src/app/theme/layout/admin/navigation/nav-content/nav-content.component.html
git commit -m "feat(web): wire NotificationBellComponent into the top nav and left nav"
```

---

### Task 10: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Full backend suite**

Run (from repo root, after `nvm use v22.22.2`): `npm run test:unit`
Expected: all pass, including the new `notifications`/`live-kit.gateway`/`chat.gateway` tests.

- [ ] **Step 2: Full backend build**

Run: `npx tsc --noEmit -p tsconfig.build.json`
Expected: no errors.

- [ ] **Step 3: Full frontend suite and build**

Run (from `packages/web/`): `npx ng build && npx ng test --watch=false`
Expected: clean build, all specs pass.

- [ ] **Step 4: Report completion**

No further commit needed for this task — Tasks 1-9 already committed their own changes.
