# Guest Meeting Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any authenticated user create a shareable meeting link that lets anyone — logged in or not — join that one LiveKit call as a named guest, with no access to any other platform feature.

**Architecture:** A new `meeting-links` NestJS resource (entity + repository + service + guard + controller) mirrors the existing `api-tokens`/`external-tasks` "escape the global JWT guard with `@SkipAuth()` plus a dedicated guard" pattern. Guests never receive a platform JWT — only an opaque LiveKit access token minted through the *existing* gRPC microservice, whose grant already carries no admin/recorder privileges for anyone (host included), so no LiveKit-side change is needed. On the frontend, a new public route (`/meet/:token`, outside the `AuthGuard`-protected tree) and a new shared `MeetingRoomComponent` (LiveKit connect + media grid + an ephemeral LiveKit-data-channel chat) serve both the guest flow and the host's own "join my meeting" flow. The existing 1:1 `call/:callerId/:calleeId` flow is untouched.

**Tech Stack:** NestJS + TypeORM (backend, Node 24), Angular 22 standalone components + signals (frontend), `livekit-client`/`livekit-server-sdk`, Jest for both.

**Spec:** `docs/superpowers/specs/2026-08-27-guest-meeting-links-design.md`

## Global Constraints

- Node >= 24 (`nvm use 24.19.0`) for all backend commands.
- Conventional Commits, no Jira prefix, no `Co-Authored-By: Claude` trailer (this repo's `AGENTS.md`).
- New Angular inputs use signal `input()`, never `@Input()`.
- Guest-facing HTTP responses (`public/:token`, `:token/join`) must never return 401/403 — the frontend's global `ErrorInterceptor` (`packages/web/src/app/services/error.interceptor.ts`) force-redirects any 401/403 response to `/auth/login`, which would break the whole no-login guest flow. Use `NotFoundException` (404, unknown token) and `GoneException` (410, expired/revoked) instead.
- The raw meeting-link token is only ever returned once, from the `POST /meeting-links` create response — it is stored hashed and never re-exposed by `GET /meeting-links` (same discipline as `ApiTokensService.findAllForUser`).

---

## Task 1: MeetingLink entity + repository

**Files:**
- Create: `src/resources/meeting-links/entities/meeting-link.entity.ts`
- Create: `src/resources/meeting-links/meeting-links.repository.ts`
- Test: `test/unit/resources/meeting-links/meeting-links.repository.unit.spec.ts`

**Interfaces:**
- Produces: `MeetingLink` entity (`id: number`, `token: string`, `roomName: string`, `hostUserId: number`, `title: string | null`, `expiresAt: Date | null`, `revokedAt: Date | null`, `createdAt: Date`, `host: Users`). `MeetingLinksRepository` extends `BaseAbstractRepository<MeetingLink>` (inherited `create`, `findOne(id)`, `save`, `delete`), plus `findAllForHost(hostUserId: number): Promise<MeetingLink[]>` and `findByTokenHash(hash: string): Promise<MeetingLink>`.

- [ ] **Step 1: Write the entity**

```typescript
// src/resources/meeting-links/entities/meeting-link.entity.ts
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Users } from '../../users/entities/users.entity';

@Index('meetingLinks_hostUserId_fk', ['hostUserId'], {})
@Entity('meetingLinks')
export class MeetingLink {
    @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
        id: number;

    @Column('varchar', { name: 'token', length: 64, unique: true })
        token: string;

    @Column('varchar', { name: 'roomName', length: 100, unique: true })
        roomName: string;

    @Column('int', { name: 'hostUserId' })
        hostUserId: number;

    @Column('varchar', { name: 'title', length: 250, nullable: true })
        title: string | null;

    @Column('timestamp', { name: 'expiresAt', nullable: true })
        expiresAt: Date | null;

    @Column('timestamp', { name: 'revokedAt', nullable: true })
        revokedAt: Date | null;

    @CreateDateColumn({ name: 'createdAt' })
        createdAt: Date;

    @ManyToOne(() => Users, { eager: true })
    @JoinColumn([{ name: 'hostUserId', referencedColumnName: 'id' }])
        host: Users;
}
```

- [ ] **Step 2: Write the failing repository test**

```typescript
// test/unit/resources/meeting-links/meeting-links.repository.unit.spec.ts
import { MeetingLinksRepository } from '../../../../src/resources/meeting-links/meeting-links.repository';
import { MeetingLink } from '../../../../src/resources/meeting-links/entities/meeting-link.entity';

describe('MeetingLinksRepository', () => {
    let repository: MeetingLinksRepository;
    let typeOrmRepository: { find: jest.Mock; findOne: jest.Mock };

    beforeEach(() => {
        typeOrmRepository = { find: jest.fn(), findOne: jest.fn() };
        repository = new MeetingLinksRepository(typeOrmRepository as any);
    });

    it('findAllForHost filters by hostUserId, newest first', async () => {
        const rows = [{ id: 1 } as MeetingLink];
        typeOrmRepository.find.mockResolvedValue(rows);

        const result = await repository.findAllForHost(7);

        expect(typeOrmRepository.find).toHaveBeenCalledWith({
            where: { hostUserId: 7 },
            order: { createdAt: 'DESC' },
        });
        expect(result).toBe(rows);
    });

    it('findByTokenHash looks up by the hashed token column', async () => {
        const row = { id: 1, token: 'hashed-value' } as MeetingLink;
        typeOrmRepository.findOne.mockResolvedValue(row);

        const result = await repository.findByTokenHash('hashed-value');

        expect(typeOrmRepository.findOne).toHaveBeenCalledWith({ where: { token: 'hashed-value' } });
        expect(result).toBe(row);
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run (after `nvm use 24.19.0`): `npx jest --config test/jest-unit.json test/unit/resources/meeting-links/meeting-links.repository.unit.spec.ts`
Expected: FAIL — `Cannot find module '../../../../src/resources/meeting-links/meeting-links.repository'`

- [ ] **Step 4: Write the repository implementation**

```typescript
// src/resources/meeting-links/meeting-links.repository.ts
import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingLink } from './entities/meeting-link.entity';

export class MeetingLinksRepository extends BaseAbstractRepository<MeetingLink> {
    constructor (
        @InjectRepository(MeetingLink)
        private readonly meetingLinksRepository: Repository<MeetingLink>
    ) {
        super(meetingLinksRepository);
    }

    findAllForHost (hostUserId: number): Promise<MeetingLink[]> {
        return this.meetingLinksRepository.find({
            where: { hostUserId },
            order: { createdAt: 'DESC' },
        });
    }

    findByTokenHash (hash: string): Promise<MeetingLink> {
        return this.meetingLinksRepository.findOne({ where: { token: hash } });
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest --config test/jest-unit.json test/unit/resources/meeting-links/meeting-links.repository.unit.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/resources/meeting-links/entities/meeting-link.entity.ts src/resources/meeting-links/meeting-links.repository.ts test/unit/resources/meeting-links/meeting-links.repository.unit.spec.ts
git commit -m "feat(meeting-links): add MeetingLink entity and repository"
```

---

## Task 2: MeetingLinksService

**Files:**
- Create: `src/resources/meeting-links/meeting-links.service.ts`
- Test: `test/unit/resources/meeting-links/meeting-links.service.unit.spec.ts`

**Interfaces:**
- Consumes: `MeetingLinksRepository` (Task 1) — `create`, `findOne(id)`, `save`, `findAllForHost`, `findByTokenHash`. `Users` entity (`id`, `firstName`, `lastName`). Reuses `generateApiToken`/`hashApiToken` from `src/resources/api-tokens/utils/hash-token.ts` (a generic sha256 opaque-token helper, not API-token-specific — avoids duplicating the same 6 lines of crypto code).
- Produces: `MeetingLinksService.createLink(host: Users, dto: CreateMeetingLinkDto): Promise<{ id: number; token: string; roomName: string; title: string | null; expiresAt: Date | null }>`, `findAllForHost(hostUserId: number): Promise<{ id: number; title: string | null; roomName: string; expiresAt: Date | null; revokedAt: Date | null; createdAt: Date }[]>` (redacted — see Step 3 note), `revoke(id: number, hostUserId: number): Promise<void>` (throws `NotFoundException` if missing/not owned), `validateToken(token: string): Promise<MeetingLink>` (throws `NotFoundException` for unknown, `GoneException` for expired/revoked) — this last method is what both the public-info endpoint and `MeetingGuestGuard` (Task 3) call.

- [ ] **Step 1: Write the failing test**

```typescript
// test/unit/resources/meeting-links/meeting-links.service.unit.spec.ts
import { TestBed } from '@automock/jest';
import { GoneException, NotFoundException } from '@nestjs/common';
import { MeetingLinksService } from '../../../../src/resources/meeting-links/meeting-links.service';
import { MeetingLinksRepository } from '../../../../src/resources/meeting-links/meeting-links.repository';
import { MeetingLink } from '../../../../src/resources/meeting-links/entities/meeting-link.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { hashApiToken } from '../../../../src/resources/api-tokens/utils/hash-token';

describe('MeetingLinksService', () => {
    let service: MeetingLinksService;
    let repository: jest.Mocked<MeetingLinksRepository>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(MeetingLinksService).compile();
        service = unit;
        repository = unitRef.get(MeetingLinksRepository);
    });

    describe('createLink', () => {
        it('stores a hashed token and a unique roomName, and returns the plaintext token once', async () => {
            const host = { id: 7 } as Users;
            repository.create.mockImplementation(async (data: Partial<MeetingLink>) => ({ ...data, id: 1 } as MeetingLink));

            const result = await service.createLink(host, { title: 'Standup' });

            const [savedData] = repository.create.mock.calls[0];
            expect(savedData.token).toBe(hashApiToken(result.token));
            expect(savedData.token).not.toBe(result.token);
            expect(savedData.hostUserId).toBe(7);
            expect(savedData.roomName).toMatch(/^meeting-/);
            expect(savedData.title).toBe('Standup');
            expect(result.token).toMatch(/^[0-9a-f]{64}$/);
        });

        it('defaults title to null and expiresAt to null when not given', async () => {
            const host = { id: 7 } as Users;
            repository.create.mockImplementation(async (data: Partial<MeetingLink>) => ({ ...data, id: 1 } as MeetingLink));

            await service.createLink(host, {});

            const [savedData] = repository.create.mock.calls[0];
            expect(savedData.title).toBeNull();
            expect(savedData.expiresAt).toBeNull();
        });
    });

    describe('findAllForHost', () => {
        it('delegates to the repository, keyed by hostUserId', async () => {
            const rows = [{
                id: 1, title: 'Standup', roomName: 'meeting-abc', expiresAt: null, revokedAt: null, createdAt: new Date(),
            }] as MeetingLink[];
            repository.findAllForHost.mockResolvedValue(rows);

            const result = await service.findAllForHost(7);

            expect(repository.findAllForHost).toHaveBeenCalledWith(7);
            expect(result).toEqual([{
                id: 1, title: 'Standup', roomName: 'meeting-abc', expiresAt: null, revokedAt: null, createdAt: rows[0].createdAt,
            }]);
        });

        it('never includes the stored token hash or the eager host relation (which carries the password hash)', async () => {
            const rows = [{
                id: 1,
                title: 'Standup',
                roomName: 'meeting-abc',
                expiresAt: null,
                revokedAt: null,
                createdAt: new Date(),
                token: 'deadbeef'.repeat(8),
                hostUserId: 7,
                host: { id: 7, password: 'bcrypt-hash-should-never-leave-the-server' } as Users,
            }] as MeetingLink[];
            repository.findAllForHost.mockResolvedValue(rows);

            const result = await service.findAllForHost(7);

            expect(JSON.stringify(result)).not.toContain('bcrypt-hash-should-never-leave-the-server');
            expect(JSON.stringify(result)).not.toContain('deadbeef');
        });
    });

    describe('revoke', () => {
        it('sets revokedAt when the link belongs to the caller', async () => {
            const link = { id: 1, hostUserId: 7, revokedAt: null } as MeetingLink;
            repository.findOne.mockResolvedValue(link);

            await service.revoke(1, 7);

            expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ id: 1, revokedAt: expect.any(Date) }));
        });

        it('throws NotFoundException when the link is not owned by the caller', async () => {
            repository.findOne.mockResolvedValue({ id: 1, hostUserId: 999 } as MeetingLink);

            await expect(service.revoke(1, 7)).rejects.toThrow(NotFoundException);
        });

        it('throws NotFoundException when the link does not exist', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(service.revoke(1, 7)).rejects.toThrow(NotFoundException);
        });
    });

    describe('validateToken', () => {
        it('returns the link for a valid, active token', async () => {
            const link = { id: 1, token: hashApiToken('plain'), revokedAt: null, expiresAt: null } as MeetingLink;
            repository.findByTokenHash.mockResolvedValue(link);

            const result = await service.validateToken('plain');

            expect(repository.findByTokenHash).toHaveBeenCalledWith(hashApiToken('plain'));
            expect(result).toBe(link);
        });

        it('throws NotFoundException for an unknown token', async () => {
            repository.findByTokenHash.mockResolvedValue(null);

            await expect(service.validateToken('plain')).rejects.toThrow(NotFoundException);
        });

        it('throws GoneException for a revoked token', async () => {
            repository.findByTokenHash.mockResolvedValue({ id: 1, revokedAt: new Date(), expiresAt: null } as MeetingLink);

            await expect(service.validateToken('plain')).rejects.toThrow(GoneException);
        });

        it('throws GoneException for an expired token', async () => {
            repository.findByTokenHash.mockResolvedValue({ id: 1, revokedAt: null, expiresAt: new Date(Date.now() - 1000) } as MeetingLink);

            await expect(service.validateToken('plain')).rejects.toThrow(GoneException);
        });

        it('accepts a token with a future expiresAt', async () => {
            const link = { id: 1, revokedAt: null, expiresAt: new Date(Date.now() + 1000 * 60 * 60) } as MeetingLink;
            repository.findByTokenHash.mockResolvedValue(link);

            const result = await service.validateToken('plain');

            expect(result).toBe(link);
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --config test/jest-unit.json test/unit/resources/meeting-links/meeting-links.service.unit.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/resources/meeting-links/meeting-links.service.ts
import { GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { MeetingLinksRepository } from './meeting-links.repository';
import { MeetingLink } from './entities/meeting-link.entity';
import { Users } from '../users/entities/users.entity';
import { CreateMeetingLinkDto } from './dto/create-meeting-link.dto';
import { generateApiToken as generateOpaqueToken, hashApiToken as hashOpaqueToken } from '../api-tokens/utils/hash-token';

@Injectable()
export class MeetingLinksService extends BaseAbstractService<MeetingLink> {
    constructor (
        protected readonly repository: MeetingLinksRepository
    ) {
        super(repository, null);
        this.currentRepository = repository;
    }

    async createLink (host: Users, dto: CreateMeetingLinkDto): Promise<{ id: number; token: string; roomName: string; title: string | null; expiresAt: Date | null }> {
        const { plaintext, hash } = generateOpaqueToken();
        const roomName = `meeting-${randomUUID()}`;
        const saved = await this.repository.create({
            token: hash,
            hostUserId: host.id,
            roomName,
            title: dto.title ?? null,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        });
        return { id: saved.id, token: plaintext, roomName: saved.roomName, title: saved.title, expiresAt: saved.expiresAt };
    }

    async findAllForHost (hostUserId: number): Promise<{ id: number; title: string | null; roomName: string; expiresAt: Date | null; revokedAt: Date | null; createdAt: Date }[]> {
        const rows = await this.repository.findAllForHost(hostUserId);
        // Never expose the stored token hash or the eager `host` relation (which
        // carries the password hash) - same discipline as ApiTokensService.findAllForUser.
        return rows.map((row) => ({
            id: row.id,
            title: row.title,
            roomName: row.roomName,
            expiresAt: row.expiresAt,
            revokedAt: row.revokedAt,
            createdAt: row.createdAt,
        }));
    }

    async revoke (id: number, hostUserId: number): Promise<void> {
        const link = await this.repository.findOne(id);
        if (!link || link.hostUserId !== hostUserId) {
            throw new NotFoundException('Meeting link not found');
        }
        await this.repository.save({ ...link, revokedAt: new Date() });
    }

    async validateToken (token: string): Promise<MeetingLink> {
        const link = await this.repository.findByTokenHash(hashOpaqueToken(token));
        if (!link) {
            throw new NotFoundException('Meeting link not found');
        }
        if (link.revokedAt || (link.expiresAt && link.expiresAt.getTime() < Date.now())) {
            throw new GoneException('Meeting link is no longer valid');
        }
        return link;
    }
}
```

- [ ] **Step 4: Write the DTO this service depends on**

```typescript
// src/resources/meeting-links/dto/create-meeting-link.dto.ts
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateMeetingLinkDto {
    @IsOptional()
    @IsString()
        title?: string;

    @IsOptional()
    @IsDateString()
        expiresAt?: string;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest --config test/jest-unit.json test/unit/resources/meeting-links/meeting-links.service.unit.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/resources/meeting-links/meeting-links.service.ts src/resources/meeting-links/dto/create-meeting-link.dto.ts test/unit/resources/meeting-links/meeting-links.service.unit.spec.ts
git commit -m "feat(meeting-links): add MeetingLinksService with token validation"
```

---

## Task 3: MeetingGuestGuard

**Files:**
- Create: `src/resources/meeting-links/guards/meeting-guest.guard.ts`
- Test: `test/unit/resources/meeting-links/meeting-guest.guard.unit.spec.ts`

**Interfaces:**
- Consumes: `MeetingLinksService.validateToken` (Task 2).
- Produces: `MeetingGuestGuard` (`CanActivate`) — reads `request.params.token`, on success sets `request['guest'] = { roomName: string, meetingLinkId: number }` (deliberately not `request.user`, so nothing downstream mistakes a guest for a real `Users` row) and returns `true`; propagates `NotFoundException`/`GoneException` from `validateToken` on failure (never throws 401/403 itself — see Global Constraints).

- [ ] **Step 1: Write the failing test**

```typescript
// test/unit/resources/meeting-links/meeting-guest.guard.unit.spec.ts
import { ExecutionContext, GoneException, NotFoundException } from '@nestjs/common';
import { MeetingGuestGuard } from '../../../../src/resources/meeting-links/guards/meeting-guest.guard';
import { MeetingLinksService } from '../../../../src/resources/meeting-links/meeting-links.service';
import { MeetingLink } from '../../../../src/resources/meeting-links/entities/meeting-link.entity';

describe('MeetingGuestGuard', () => {
    let guard: MeetingGuestGuard;
    let service: jest.Mocked<Pick<MeetingLinksService, 'validateToken'>>;

    beforeEach(() => {
        service = { validateToken: jest.fn() };
        guard = new MeetingGuestGuard(service as unknown as MeetingLinksService);
    });

    function contextWithToken (token: string): { context: ExecutionContext; request: Record<string, unknown> } {
        const request: Record<string, unknown> = { params: { token } };
        const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
        return { context, request };
    }

    it('attaches a guest identity (not request.user) for a valid token', async () => {
        const link = { id: 1, roomName: 'meeting-abc' } as MeetingLink;
        service.validateToken.mockResolvedValue(link);
        const { context, request } = contextWithToken('plain-token');

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(request['guest']).toEqual({ roomName: 'meeting-abc', meetingLinkId: 1 });
        expect(request['user']).toBeUndefined();
    });

    it('propagates NotFoundException for an unknown token (never 401)', async () => {
        service.validateToken.mockRejectedValue(new NotFoundException());
        const { context } = contextWithToken('unknown');

        await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    });

    it('propagates GoneException for an expired/revoked token (never 401)', async () => {
        service.validateToken.mockRejectedValue(new GoneException());
        const { context } = contextWithToken('expired');

        await expect(guard.canActivate(context)).rejects.toThrow(GoneException);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --config test/jest-unit.json test/unit/resources/meeting-links/meeting-guest.guard.unit.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/resources/meeting-links/guards/meeting-guest.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { MeetingLinksService } from '../meeting-links.service';

@Injectable()
export class MeetingGuestGuard implements CanActivate {
    constructor (private readonly meetingLinksService: MeetingLinksService) {}

    async canActivate (context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = request.params.token;
        const link = await this.meetingLinksService.validateToken(token);
        request['guest'] = { roomName: link.roomName, meetingLinkId: link.id };
        return true;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --config test/jest-unit.json test/unit/resources/meeting-links/meeting-guest.guard.unit.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/resources/meeting-links/guards/meeting-guest.guard.ts test/unit/resources/meeting-links/meeting-guest.guard.unit.spec.ts
git commit -m "feat(meeting-links): add MeetingGuestGuard"
```

---

## Task 4: Controller, module wiring, and LiveKit gRPC client reuse

**Files:**
- Create: `src/resources/meeting-links/dto/join-meeting.dto.ts`
- Create: `src/resources/meeting-links/meeting-links.controller.ts`
- Create: `src/resources/meeting-links/meeting-links.module.ts`
- Modify: `src/resources/live-kit/live-kit.module.ts` (export the gRPC client provider so other modules can inject it)
- Modify: `src/resources/live-kit/live-kit-token.controller.ts` (export the local `LiveKitTokenMicroservice` interface for reuse)
- Modify: `src/app.module.ts` (register `MeetingLinksModule`)

**Interfaces:**
- Consumes: `MeetingLinksService` (Task 2), `MeetingGuestGuard` (Task 3), the `'LIVEKIT_PACKAGE'` gRPC client already defined in `live-kit.module.ts` (same client `LiveKitTokenController` uses — no proto changes: the existing grant `{roomJoin: true, room: roomName}` in `LiveKitGrpcService.serviceGrpc` already carries no admin/recorder privileges for anyone, host included, so it's reused as-is for guests too).
- Produces: `POST /meeting-links`, `GET /meeting-links`, `DELETE /meeting-links/:id` (all behind the existing global `AuthGuard`), `GET /meeting-links/public/:token` and `POST /meeting-links/:token/join` (both `@SkipAuth()`).

- [ ] **Step 1: Export the reusable pieces from the live-kit module**

```typescript
// src/resources/live-kit/live-kit-token.controller.ts
import { Controller, Post, Body, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';
import { CreateLiveKitDto } from './dto/create-live-kit.dto';

export interface LiveKitTokenMicroservice {
  LiveKitToken(data: { roomName: string; participantName: string }): Observable<{ token: string }>;
}

@Controller('api')
export class LiveKitTokenController implements OnModuleInit {
    private livekitService: LiveKitTokenMicroservice;

    constructor (@Inject('LIVEKIT_PACKAGE') private readonly client: ClientGrpc) {}

    onModuleInit () {
        this.livekitService = this.client.getService<LiveKitTokenMicroservice>('LiveKitMicroservice');
    }

  @Post('token')
    async getToken (@Body() body: CreateLiveKitDto) {
        const obs = this.livekitService.LiveKitToken(body);
        const response = await lastValueFrom(obs);
        return { token: response.token };
    }
}
```

(Only change: `interface LiveKitTokenMicroservice` gains `export`.)

```typescript
// src/resources/live-kit/live-kit.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { LiveKitGrpcController } from './microservice/live-kit.grpc.controller';
import { LiveKitGrpcService } from './microservice/live-kit.grpc.service';
import { LiveKitTokenController } from './live-kit-token.controller';
import { LiveKitWebhookController } from './live-kit-webhook.controller';
import { LiveKitGateway } from './gateway/live-kit.gateway';
import { JwtService } from '@nestjs/jwt';

const liveKitClientModule = ClientsModule.register([
    {
        name: 'LIVEKIT_PACKAGE',
        transport: Transport.GRPC,
        options: {
            package: 'livekit',
            protoPath: join(process.cwd(), 'proto/live-kit.proto'),
            url: process.env.LIVE_KIT_SERVER
        },
    },
]);

@Module({
    imports: [liveKitClientModule],
    controllers: [LiveKitTokenController, LiveKitGrpcController, LiveKitWebhookController],
    providers: [LiveKitGrpcService, LiveKitGateway, JwtService],
    exports: [LiveKitGateway, liveKitClientModule],
})
export class LiveKitModule {}
```

- [ ] **Step 2: Write the join DTO**

```typescript
// src/resources/meeting-links/dto/join-meeting.dto.ts
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class JoinMeetingDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
        displayName: string;
}
```

- [ ] **Step 3: Write the controller**

```typescript
// src/resources/meeting-links/meeting-links.controller.ts
import { Body, Controller, Delete, Get, Inject, OnModuleInit, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { Request } from 'express';
import { randomUUID } from 'crypto';
import { MeetingLinksService } from './meeting-links.service';
import { CreateMeetingLinkDto } from './dto/create-meeting-link.dto';
import { JoinMeetingDto } from './dto/join-meeting.dto';
import { MeetingGuestGuard } from './guards/meeting-guest.guard';
import { SkipAuth } from '../auth/decorators/public.guard';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';
import { LiveKitTokenMicroservice } from '../live-kit/live-kit-token.controller';

@Controller('meeting-links')
export class MeetingLinksController implements OnModuleInit {
    private livekitService: LiveKitTokenMicroservice;

    constructor (
        private readonly meetingLinksService: MeetingLinksService,
        @Inject('LIVEKIT_PACKAGE') private readonly liveKitClient: ClientGrpc,
    ) {}

    onModuleInit () {
        this.livekitService = this.liveKitClient.getService<LiveKitTokenMicroservice>('LiveKitMicroservice');
    }

    @Post()
    create (
        @Body() dto: CreateMeetingLinkDto,
        @User() user: Users,
    ) {
        return this.meetingLinksService.createLink(user, dto);
    }

    @Get()
    findAll (@User() user: Users) {
        return this.meetingLinksService.findAllForHost(user.id);
    }

    @Delete(':id')
    revoke (
        @Param('id', ParseIntPipe) id: number,
        @User() user: Users,
    ): Promise<void> {
        return this.meetingLinksService.revoke(id, user.id);
    }

    @Get('public/:token')
    @SkipAuth()
    async getPublicInfo (@Param('token') token: string) {
        const link = await this.meetingLinksService.validateToken(token);
        return {
            title: link.title,
            hostName: `${link.host.firstName} ${link.host.lastName}`,
            roomName: link.roomName,
        };
    }

    @Post(':token/join')
    @SkipAuth()
    @UseGuards(MeetingGuestGuard)
    async join (
        @Body() dto: JoinMeetingDto,
        @Req() request: Request,
    ): Promise<{ livekitToken: string; roomName: string }> {
        const { roomName } = request['guest'] as { roomName: string; meetingLinkId: number };
        const participantName = `${dto.displayName}-${randomUUID().slice(0, 8)}`;
        const obs = this.livekitService.LiveKitToken({ roomName, participantName });
        const response = await lastValueFrom(obs);
        return { livekitToken: response.token, roomName };
    }
}
```

Note: `participantName` gets a random suffix because two guests can legitimately type the same display name — LiveKit identities must be unique per room.

- [ ] **Step 4: Write the module**

```typescript
// src/resources/meeting-links/meeting-links.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingLinksController } from './meeting-links.controller';
import { MeetingLinksService } from './meeting-links.service';
import { MeetingLinksRepository } from './meeting-links.repository';
import { MeetingLink } from './entities/meeting-link.entity';
import { MeetingGuestGuard } from './guards/meeting-guest.guard';
import { LiveKitModule } from '../live-kit/live-kit.module';

@Module({
    imports: [TypeOrmModule.forFeature([MeetingLink]), LiveKitModule],
    controllers: [MeetingLinksController],
    providers: [MeetingLinksService, MeetingLinksRepository, MeetingGuestGuard],
})
export class MeetingLinksModule {}
```

- [ ] **Step 5: Register the module in `AppModule`**

In `src/app.module.ts`, add the import and list entry (mirroring the existing `ExternalTasksModule` registration):

```typescript
import { MeetingLinksModule } from './resources/meeting-links/meeting-links.module';
```

Add `MeetingLinksModule` to the `@Module({ imports: [...] })` array, after `ExternalTasksModule`.

- [ ] **Step 6: Build to catch type errors**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/resources/meeting-links/dto/join-meeting.dto.ts src/resources/meeting-links/meeting-links.controller.ts src/resources/meeting-links/meeting-links.module.ts src/resources/live-kit/live-kit.module.ts src/resources/live-kit/live-kit-token.controller.ts src/app.module.ts
git commit -m "feat(meeting-links): wire up MeetingLinksController and module"
```

---

## Task 5: Backend e2e test — the security boundary

**Files:**
- Create: `test/integration/meeting-links.e2e.spec.ts`

**Interfaces:**
- Consumes: `MeetingLinksController`, `MeetingLinksService`, `MeetingLinksRepository`, `MeetingGuestGuard`, the real `AuthGuard` (`src/resources/auth/guards/auth.guard.ts`), all from Tasks 1-4.

This is the one test in the plan that proves the actual security property end-to-end over HTTP: the global `AuthGuard` really does block unauthenticated requests to the host-only routes, `@SkipAuth()` really does let the public/join routes through without a token, and a guest's LiveKit token is not usable as a platform JWT anywhere else. It follows this repo's existing e2e convention (see `test/integration/task-phase.e2e.spec.ts`) of a minimal `Test.createTestingModule` with a real guard wired via `APP_GUARD` and a mocked repository — not a full app/DB boot.

- [ ] **Step 1: Write the test**

```typescript
// test/integration/meeting-links.e2e.spec.ts
import { INestApplication } from '@nestjs/common/interfaces/nest-application.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import request = require('supertest');
import { MeetingLinksController } from '../../src/resources/meeting-links/meeting-links.controller';
import { MeetingLinksService } from '../../src/resources/meeting-links/meeting-links.service';
import { MeetingLinksRepository } from '../../src/resources/meeting-links/meeting-links.repository';
import { MeetingGuestGuard } from '../../src/resources/meeting-links/guards/meeting-guest.guard';
import { AuthGuard } from '../../src/resources/auth/guards/auth.guard';
import { hashApiToken } from '../../src/resources/api-tokens/utils/hash-token';

describe('MeetingLinksController (e2e)', () => {
    let app: INestApplication;
    let jwtService: JwtService;
    const validPlaintextToken = 'a'.repeat(64);
    const meetingLinkRow = {
        id: 1,
        token: hashApiToken(validPlaintextToken),
        roomName: 'meeting-abc123',
        hostUserId: 7,
        title: 'Standup',
        expiresAt: null,
        revokedAt: null,
        host: { id: 7, firstName: 'Ada', lastName: 'Lovelace' },
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [MeetingLinksController],
            providers: [
                MeetingLinksService,
                {
                    provide: MeetingLinksRepository,
                    useValue: {
                        create: jest.fn().mockResolvedValue(meetingLinkRow),
                        findAllForHost: jest.fn().mockResolvedValue([meetingLinkRow]),
                        findOne: jest.fn().mockResolvedValue(meetingLinkRow),
                        findByTokenHash: jest.fn((hash: string) =>
                            Promise.resolve(hash === meetingLinkRow.token ? meetingLinkRow : null)),
                        save: jest.fn().mockResolvedValue({ ...meetingLinkRow, revokedAt: new Date() }),
                    },
                },
                MeetingGuestGuard,
                AuthGuard,
                { provide: APP_GUARD, useExisting: AuthGuard },
                JwtService,
                Reflector,
                { provide: ConfigService, useValue: { get: () => 'test-secret' } },
                {
                    provide: 'LIVEKIT_PACKAGE',
                    useValue: { getService: () => ({ LiveKitToken: () => of({ token: 'fake-livekit-jwt' }) }) },
                },
            ],
        }).compile();

        jwtService = moduleFixture.get(JwtService);
        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('rejects creating a meeting link without a platform JWT', () => {
        return request(app.getHttpServer())
            .post('/meeting-links')
            .send({ title: 'Standup' })
            .expect(401);
    });

    it('creates a meeting link with a valid platform JWT', async () => {
        const token = await jwtService.signAsync({ user: { id: 7 } }, { secret: 'test-secret' });
        return request(app.getHttpServer())
            .post('/meeting-links')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Standup' })
            .expect(201);
    });

    it('revokes a meeting link owned by the caller', async () => {
        const token = await jwtService.signAsync({ user: { id: 7 } }, { secret: 'test-secret' });
        return request(app.getHttpServer())
            .delete('/meeting-links/1')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
    });

    it('returns public meeting info without any Authorization header', () => {
        return request(app.getHttpServer())
            .get(`/meeting-links/public/${validPlaintextToken}`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual({ title: 'Standup', hostName: 'Ada Lovelace', roomName: 'meeting-abc123' });
            });
    });

    it('returns 404, not 401, for an unknown token', () => {
        return request(app.getHttpServer())
            .get('/meeting-links/public/unknown-token')
            .expect(404);
    });

    it('lets an unauthenticated guest join and mints a LiveKit token', () => {
        return request(app.getHttpServer())
            .post(`/meeting-links/${validPlaintextToken}/join`)
            .send({ displayName: 'Visiting Guest' })
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual({ livekitToken: 'fake-livekit-jwt', roomName: 'meeting-abc123' });
            });
    });

    it("rejects using a guest's LiveKit token as a platform Bearer JWT", () => {
        return request(app.getHttpServer())
            .get('/meeting-links')
            .set('Authorization', 'Bearer fake-livekit-jwt')
            .expect(401);
    });
});
```

- [ ] **Step 2: Run the test**

Run: `npx jest --config test/jest-e2e.json test/integration/meeting-links.e2e.spec.ts`
Expected: PASS (all 7 cases).

- [ ] **Step 3: Commit**

```bash
git add test/integration/meeting-links.e2e.spec.ts
git commit -m "test(meeting-links): add e2e coverage for the guest auth boundary"
```

---

## Task 6: Guest landing page (public route)

**Files:**
- Modify: `packages/web/src/app/services/data.service.ts`
- Create: `packages/web/src/app/guest-meeting/guest-meeting-landing.component.ts`
- Create: `packages/web/src/app/guest-meeting/guest-meeting-landing.component.html`
- Create: `packages/web/src/app/guest-meeting/guest-meeting-landing.component.css`
- Create: `packages/web/src/app/guest-meeting/guest-meeting-landing.component.spec.ts`
- Modify: `packages/web/src/app/app-routing.module.ts`
- Modify: `packages/web/src/assets/i18n/en.json`

**Interfaces:**
- Produces: `DataService.getPublicMeetingLink(token: string): Observable<{ title: string | null; hostName: string; roomName: string }>`, `DataService.joinMeetingAsGuest(token: string, displayName: string): Observable<{ livekitToken: string; roomName: string }>`. `GuestMeetingLandingComponent` — route-bound `token = input<string>('')`, renders the join form, then hands off to `MeetingRoomComponent` (Task 7) via inputs `livekitToken`, `roomName`, `displayName`.

- [ ] **Step 1: Add the two DataService methods**

In `packages/web/src/app/services/data.service.ts`, add:

```typescript
    getPublicMeetingLink(token: string) {
        return this.http.get<{ title: string | null; hostName: string; roomName: string }>(
            this.apiHost + '/meeting-links/public/' + token,
        );
    }
    joinMeetingAsGuest(token: string, displayName: string) {
        return this.http.post<{ livekitToken: string; roomName: string }>(
            this.apiHost + '/meeting-links/' + token + '/join',
            { displayName },
        );
    }
```

- [ ] **Step 2: Write the failing component test**

```typescript
// packages/web/src/app/guest-meeting/guest-meeting-landing.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { GuestMeetingLandingComponent } from './guest-meeting-landing.component';
import { DataService } from '../services/data.service';

describe('GuestMeetingLandingComponent', () => {
  let component: GuestMeetingLandingComponent;
  let fixture: ComponentFixture<GuestMeetingLandingComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;

  beforeEach(async () => {
    dataServiceSpy = jasmine.createSpyObj('DataService', ['getPublicMeetingLink', 'joinMeetingAsGuest']);

    await TestBed.configureTestingModule({
      imports: [GuestMeetingLandingComponent, TranslateModule.forRoot()],
      providers: [{ provide: DataService, useValue: dataServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(GuestMeetingLandingComponent);
    component = fixture.componentInstance;
  });

  it('shows the join form for a valid token', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(of({ title: 'Standup', hostName: 'Ada Lovelace', roomName: 'meeting-abc' }));
    fixture.componentRef.setInput('token', 'plain-token');

    fixture.detectChanges();

    expect(component.state()).toBe('ready');
    expect(component.meetingInfo()?.hostName).toBe('Ada Lovelace');
  });

  it('shows an invalid state when the link is unknown or expired', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(throwError(() => new Error('not found')));
    fixture.componentRef.setInput('token', 'bad-token');

    fixture.detectChanges();

    expect(component.state()).toBe('invalid');
  });

  it('joins with the entered display name and switches to in-call state', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(of({ title: 'Standup', hostName: 'Ada Lovelace', roomName: 'meeting-abc' }));
    dataServiceSpy.joinMeetingAsGuest.and.returnValue(of({ livekitToken: 'guest-jwt', roomName: 'meeting-abc' }));
    fixture.componentRef.setInput('token', 'plain-token');
    fixture.detectChanges();

    component.displayNameControl.setValue('Visiting Guest');
    component.join();

    expect(dataServiceSpy.joinMeetingAsGuest).toHaveBeenCalledWith('plain-token', 'Visiting Guest');
    expect(component.state()).toBe('in-call');
    expect(component.connection()).toEqual({ livekitToken: 'guest-jwt', roomName: 'meeting-abc', displayName: 'Visiting Guest' });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run (from `packages/web/`): `npm test -- guest-meeting-landing.component.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the component**

```typescript
// packages/web/src/app/guest-meeting/guest-meeting-landing.component.ts
import { Component, OnInit, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DataService } from '../services/data.service';
import { MeetingRoomComponent } from '../meeting-room/meeting-room.component';

interface MeetingInfo {
  title: string | null;
  hostName: string;
  roomName: string;
}

interface GuestConnection {
  livekitToken: string;
  roomName: string;
  displayName: string;
}

@Component({
  selector: 'app-guest-meeting-landing',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, MeetingRoomComponent],
  templateUrl: './guest-meeting-landing.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './guest-meeting-landing.component.css',
})
export class GuestMeetingLandingComponent implements OnInit {
  private dataService = inject(DataService);

  token = input<string>('');

  state = signal<'loading' | 'invalid' | 'ready' | 'in-call'>('loading');
  meetingInfo = signal<MeetingInfo | null>(null);
  connection = signal<GuestConnection | null>(null);
  displayNameControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  ngOnInit(): void {
    this.dataService.getPublicMeetingLink(this.token()).subscribe({
      next: (info) => {
        this.meetingInfo.set(info);
        this.state.set('ready');
      },
      error: () => this.state.set('invalid'),
    });
  }

  join(): void {
    if (this.displayNameControl.invalid) {
      return;
    }
    const displayName = this.displayNameControl.value;
    this.dataService.joinMeetingAsGuest(this.token(), displayName).subscribe((result) => {
      this.connection.set({ livekitToken: result.livekitToken, roomName: result.roomName, displayName });
      this.state.set('in-call');
    });
  }

  onLeave(): void {
    this.connection.set(null);
    this.state.set('ready');
  }
}
```

- [ ] **Step 5: Write the template**

```html
<!-- packages/web/src/app/guest-meeting/guest-meeting-landing.component.html -->
<div class="guest-meeting-page">
  @switch (state()) {
    @case ('loading') {
      <p>{{ 'guest_meeting.loading' | translate }}</p>
    }
    @case ('invalid') {
      <p>{{ 'guest_meeting.invalid_link' | translate }}</p>
    }
    @case ('ready') {
      <div class="guest-join-card">
        <h2>{{ meetingInfo()?.title || ('guest_meeting.untitled' | translate) }}</h2>
        <p>{{ 'guest_meeting.hosted_by' | translate: { name: meetingInfo()?.hostName } }}</p>
        <input
          type="text"
          [formControl]="displayNameControl"
          [placeholder]="'guest_meeting.your_name' | translate"
        />
        <button class="btn btn-primary" [disabled]="displayNameControl.invalid" (click)="join()">
          {{ 'guest_meeting.join' | translate }}
        </button>
      </div>
    }
    @case ('in-call') {
      <app-meeting-room
        [livekitToken]="connection()!.livekitToken"
        [roomName]="connection()!.roomName"
        [displayName]="connection()!.displayName"
        (leaveRoomOutput)="onLeave()"
      ></app-meeting-room>
    }
  }
</div>
```

- [ ] **Step 6: Add a minimal stylesheet**

```css
/* packages/web/src/app/guest-meeting/guest-meeting-landing.component.css */
.guest-meeting-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1b1b1f;
}
.guest-join-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  min-width: 320px;
  text-align: center;
}
.guest-join-card input {
  width: 100%;
  margin: 12px 0;
  padding: 8px;
}
```

- [ ] **Step 7: Add translation keys**

In `packages/web/src/assets/i18n/en.json`, add:

```json
  "guest_meeting": {
    "loading": "Loading meeting…",
    "invalid_link": "This meeting link is no longer valid.",
    "untitled": "Untitled meeting",
    "hosted_by": "Hosted by {{name}}",
    "your_name": "Your name",
    "join": "Join meeting"
  },
```

- [ ] **Step 8: Register the top-level public route**

In `packages/web/src/app/app-routing.module.ts`, add a route entry as a sibling of the `AdminComponent` block (NOT nested inside it, so it stays outside `AuthGuard`):

```typescript
  {
    path: 'meet/:token',
    loadComponent: () => import('./guest-meeting/guest-meeting-landing.component').then(m => m.GuestMeetingLandingComponent),
  },
```

Place it directly before the `path: '**'` wildcard entry.

- [ ] **Step 9: Run test to verify it passes**

Run (from `packages/web/`): `npm test -- guest-meeting-landing.component.spec.ts`
Expected: PASS. (`MeetingRoomComponent` doesn't exist yet — Step 4's import will fail to compile until Task 7 is done; if running this task in isolation, temporarily stub `meeting-room.component.ts` with an empty standalone component exporting `MeetingRoomComponent` with the four inputs/one output as no-ops, then let Task 7 replace it. If executing tasks in order, just do Task 7 immediately after this step before running the test.)

- [ ] **Step 10: Commit**

```bash
git add packages/web/src/app/services/data.service.ts packages/web/src/app/guest-meeting packages/web/src/app/app-routing.module.ts packages/web/src/assets/i18n/en.json
git commit -m "feat(guest-meeting): add public guest landing page and route"
```

---

## Task 7: MeetingRoomComponent (shared LiveKit room UI)

**Files:**
- Create: `packages/web/src/app/meeting-room/meeting-room.component.ts`
- Create: `packages/web/src/app/meeting-room/meeting-room.component.html`
- Create: `packages/web/src/app/meeting-room/meeting-room.component.css`
- Create: `packages/web/src/app/meeting-room/meeting-room.component.spec.ts`
- Modify: `packages/web/src/assets/i18n/en.json`

This is a new, self-contained component — it does **not** modify the existing `CallComponent` (`packages/web/src/app/pages/call/wellcome/call.component.ts`), which stays untouched per the spec's non-goals. It reuses the same proven LiveKit-connection pattern (room events, track maps) but takes an already-minted token as an input instead of fetching one itself, and renders a flat video grid (no fullscreen/PiP/drag — out of scope here) since both host and guest already obtained their token via different endpoints before this component mounts.

**Interfaces:**
- Consumes: `VideoComponent` (`packages/web/src/app/pages/call/video/video.component.ts`), `AudioComponent` (`packages/web/src/app/pages/call/audio/audio.component.ts`) — both reused unmodified. `environment.livekitUrl` (`packages/web/src/environments/environment.ts`).
- Produces: `MeetingRoomComponent` — inputs `livekitToken = input.required<string>()`, `roomName = input.required<string>()`, `displayName = input.required<string>()`; output `leaveRoomOutput = output()`; exposes `room = signal<Room | undefined>()` (consumed by `MeetingChatComponent` in Task 8) and `chatOpen = signal<boolean>(false)`.

- [ ] **Step 1: Write the failing test**

Testing philosophy note: this repo's existing `call.component.spec.ts` never invokes the real LiveKit `Room.connect()` (no WebRTC in jsdom) — it tests pure logic by setting `component.room` to a fake object directly. This test follows the same approach.

```typescript
// packages/web/src/app/meeting-room/meeting-room.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MeetingRoomComponent } from './meeting-room.component';

describe('MeetingRoomComponent', () => {
  let component: MeetingRoomComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MeetingRoomComponent, TranslateModule.forRoot()],
    });

    const fixture = TestBed.createComponent(MeetingRoomComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('livekitToken', 'fake-token');
    fixture.componentRef.setInput('roomName', 'meeting-abc');
    fixture.componentRef.setInput('displayName', 'Ada');
    spyOn(component, 'joinRoom');
  });

  it('does not auto-connect before ngOnInit runs joinRoom', () => {
    expect(component.joinRoom).not.toHaveBeenCalled();
  });

  it('setCameraEnabled toggles the fake room and the local track when there is no active room', async () => {
    await component.setCameraEnabled(true);

    // No room yet (joinRoom is stubbed) - the guard clause must no-op safely.
    expect(component.cameraIsEnable()).toBe(false);
  });

  it('setCameraEnabled updates state once a room is present', async () => {
    const fakeRoom = { localParticipant: { setCameraEnabled: jasmine.createSpy().and.resolveTo(undefined) } };
    component.room.set(fakeRoom as any);

    await component.setCameraEnabled(true);

    expect(fakeRoom.localParticipant.setCameraEnabled).toHaveBeenCalledWith(true);
    expect(component.cameraIsEnable()).toBe(true);
  });

  it('leaveRoom disconnects the room and emits leaveRoomOutput', async () => {
    const fakeRoom = { disconnect: jasmine.createSpy().and.resolveTo(undefined) };
    component.room.set(fakeRoom as any);
    const emitSpy = spyOn(component.leaveRoomOutput, 'emit');

    await component.leaveRoom();

    expect(fakeRoom.disconnect).toHaveBeenCalled();
    expect(component.room()).toBeUndefined();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('toggles the chat panel', () => {
    expect(component.chatOpen()).toBe(false);

    component.chatOpen.set(!component.chatOpen());

    expect(component.chatOpen()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `packages/web/`): `npm test -- meeting-room.component.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

```typescript
// packages/web/src/app/meeting-room/meeting-room.component.ts
import { Component, OnDestroy, OnInit, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {
  LocalVideoTrack,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  VideoPresets,
} from 'livekit-client';
import { VideoComponent } from '../pages/call/video/video.component';
import { AudioComponent } from '../pages/call/audio/audio.component';
import { MeetingChatComponent } from './meeting-chat/meeting-chat.component';
import { environment } from '../../environments/environment';

interface TrackInfo {
  trackPublication: RemoteTrackPublication;
  participantIdentity: string;
}

@Component({
  selector: 'app-meeting-room',
  standalone: true,
  imports: [NgClass, TranslateModule, VideoComponent, AudioComponent, MeetingChatComponent],
  templateUrl: './meeting-room.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './meeting-room.component.css',
})
export class MeetingRoomComponent implements OnInit, OnDestroy {
  livekitToken = input.required<string>();
  roomName = input.required<string>();
  displayName = input.required<string>();
  leaveRoomOutput = output();

  room = signal<Room | undefined>(undefined);
  localCameraTrack = signal<LocalVideoTrack | undefined>(undefined);
  localTrack = signal<LocalVideoTrack | undefined>(undefined);
  remoteTracksMap = signal<Map<string, TrackInfo>>(new Map());
  cameraIsEnable = signal<boolean>(false);
  microphoneEnabled = signal<boolean>(true);
  screenShareEnabled = signal<boolean>(false);
  chatOpen = signal<boolean>(false);
  private destroyed = false;

  ngOnInit(): void {
    this.joinRoom();
  }

  async joinRoom(): Promise<void> {
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
    });
    this.room.set(room);

    room.on(RoomEvent.TrackSubscribed, (_track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      this.remoteTracksMap.update((map) => {
        map.set(publication.trackSid, { trackPublication: publication, participantIdentity: participant.identity });
        return map;
      });
    });
    room.on(RoomEvent.TrackUnsubscribed, (_track: RemoteTrack, publication: RemoteTrackPublication) => {
      this.remoteTracksMap.update((map) => {
        map.delete(publication.trackSid);
        return map;
      });
    });

    try {
      await room.connect(environment.livekitUrl, this.livekitToken());
      await room.localParticipant.setCameraEnabled(true);
      await room.localParticipant.setMicrophoneEnabled(true);
      this.cameraIsEnable.set(true);
      const cameraTrack = Array.from(room.localParticipant.videoTrackPublications.values())
        .find((pub) => pub.source === 'camera')?.videoTrack;
      if (cameraTrack) {
        this.localCameraTrack.set(cameraTrack);
        this.localTrack.set(cameraTrack);
      }
    } catch {
      await this.leaveRoom();
    }
  }

  async leaveRoom(): Promise<void> {
    await this.room()?.disconnect();
    this.room.set(undefined);
    this.localTrack.set(undefined);
    this.remoteTracksMap.set(new Map());
    if (!this.destroyed) {
      this.leaveRoomOutput.emit();
    }
  }

  async setCameraEnabled(value: boolean): Promise<void> {
    const room = this.room();
    if (!room) {
      return;
    }
    await room.localParticipant.setCameraEnabled(value);
    this.cameraIsEnable.set(value);
    if (!this.screenShareEnabled()) {
      this.localTrack.set(value ? this.localCameraTrack() : undefined);
    }
  }

  async setMicrophoneEnabled(value: boolean): Promise<void> {
    const room = this.room();
    if (!room) {
      return;
    }
    await room.localParticipant.setMicrophoneEnabled(value);
    this.microphoneEnabled.set(value);
  }

  async setScreenShareEnabled(value: boolean): Promise<void> {
    const room = this.room();
    if (!room) {
      return;
    }
    await room.localParticipant.setScreenShareEnabled(value);
    this.screenShareEnabled.set(value);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.leaveRoom();
  }
}
```

- [ ] **Step 4: Write the template**

```html
<!-- packages/web/src/app/meeting-room/meeting-room.component.html -->
<div class="meeting-room">
  <div class="meeting-header">
    <span class="meeting-room-name">{{ roomName() }}</span>
    <div class="meeting-controls">
      <button
        class="btn btn-sm"
        [ngClass]="cameraIsEnable() ? 'btn-success' : 'btn-danger'"
        (click)="setCameraEnabled(!cameraIsEnable())"
      >
        <i class="fas" [ngClass]="cameraIsEnable() ? 'fa-video' : 'fa-video-slash'"></i>
      </button>
      <button
        class="btn btn-sm"
        [ngClass]="microphoneEnabled() ? 'btn-success' : 'btn-danger'"
        (click)="setMicrophoneEnabled(!microphoneEnabled())"
      >
        <i class="fas" [ngClass]="microphoneEnabled() ? 'fa-microphone' : 'fa-microphone-slash'"></i>
      </button>
      <button
        class="btn btn-sm"
        [ngClass]="screenShareEnabled() ? 'btn-warning' : 'btn-info'"
        (click)="setScreenShareEnabled(!screenShareEnabled())"
      >
        <i class="fas" [ngClass]="screenShareEnabled() ? 'fa-stop' : 'fa-desktop'"></i>
      </button>
      <button class="btn btn-sm" (click)="chatOpen.set(!chatOpen())">
        <i class="fas fa-comment"></i>
      </button>
      <button class="btn btn-sm btn-danger" (click)="leaveRoom()">
        <i class="fas fa-sign-out-alt"></i> {{ 'meeting_room.leave' | translate }}
      </button>
    </div>
  </div>

  <div class="meeting-video-grid">
    @if (localTrack()) {
      <video-component
        [track]="localTrack()!"
        [participantIdentity]="displayName() + ' ' + ('meeting_room.you_suffix' | translate)"
        [local]="true"
      ></video-component>
    }
    @for (remoteTrack of remoteTracksMap().values(); track remoteTrack.trackPublication.trackSid) {
      @if (remoteTrack.trackPublication.kind === 'video') {
        <video-component
          [track]="remoteTrack.trackPublication.videoTrack!"
          [participantIdentity]="remoteTrack.participantIdentity"
          [local]="false"
        ></video-component>
      } @else if (remoteTrack.trackPublication.kind === 'audio') {
        <audio-component [track]="remoteTrack.trackPublication.audioTrack!" hidden></audio-component>
      }
    }
  </div>

  @if (chatOpen()) {
    <app-meeting-chat [room]="room()" [displayName]="displayName()"></app-meeting-chat>
  }
</div>
```

- [ ] **Step 5: Add a minimal stylesheet**

```css
/* packages/web/src/app/meeting-room/meeting-room.component.css */
.meeting-room {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1b1b1f;
  color: #fff;
}
.meeting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
}
.meeting-video-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 8px;
  padding: 8px;
}
```

- [ ] **Step 6: Add translation keys**

In `packages/web/src/assets/i18n/en.json`, add:

```json
  "meeting_room": {
    "leave": "Leave",
    "you_suffix": "(You)",
    "chat_placeholder": "Type a message…",
    "send": "Send"
  },
```

- [ ] **Step 7: Run test to verify it passes**

Run (from `packages/web/`): `npm test -- meeting-room.component.spec.ts`
Expected: PASS. (`MeetingChatComponent` doesn't exist until Task 8 — do Task 8 immediately after this step, or temporarily stub it with an empty standalone component taking `room`/`displayName` inputs, before running this test.)

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/app/meeting-room/meeting-room.component.ts packages/web/src/app/meeting-room/meeting-room.component.html packages/web/src/app/meeting-room/meeting-room.component.css packages/web/src/app/meeting-room/meeting-room.component.spec.ts packages/web/src/assets/i18n/en.json
git commit -m "feat(meeting-room): add shared LiveKit meeting room component"
```

---

## Task 8: Ephemeral in-call chat (LiveKit data channel)

**Files:**
- Create: `packages/web/src/app/meeting-room/meeting-chat/meeting-chat.component.ts`
- Create: `packages/web/src/app/meeting-room/meeting-chat/meeting-chat.component.html`
- Create: `packages/web/src/app/meeting-room/meeting-chat/meeting-chat.component.css`
- Create: `packages/web/src/app/meeting-room/meeting-chat/meeting-chat.component.spec.ts`

**Interfaces:**
- Consumes: `Room` (from `livekit-client`) passed in as an input by `MeetingRoomComponent` (Task 7).
- Produces: `MeetingChatComponent` — inputs `room = input.required<Room | undefined>()`, `displayName = input.required<string>()`. Not persisted anywhere; messages exist only in-memory for the lifetime of the call.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/web/src/app/meeting-room/meeting-chat/meeting-chat.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RoomEvent } from 'livekit-client';
import { MeetingChatComponent } from './meeting-chat.component';

describe('MeetingChatComponent', () => {
  let component: MeetingChatComponent;
  let fakeRoom: { on: jasmine.Spy; off: jasmine.Spy; localParticipant: { publishData: jasmine.Spy } };

  beforeEach(() => {
    fakeRoom = {
      on: jasmine.createSpy('on'),
      off: jasmine.createSpy('off'),
      localParticipant: { publishData: jasmine.createSpy('publishData') },
    };

    TestBed.configureTestingModule({
      imports: [MeetingChatComponent, TranslateModule.forRoot()],
    });

    const fixture = TestBed.createComponent(MeetingChatComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('room', fakeRoom as any);
    fixture.componentRef.setInput('displayName', 'Ada');
    fixture.detectChanges();
  });

  it('registers a DataReceived listener on init', () => {
    expect(fakeRoom.on).toHaveBeenCalledWith(RoomEvent.DataReceived, jasmine.any(Function));
  });

  it('sending a message publishes it over the data channel and appends it locally', () => {
    component.draft = 'hello there';

    component.send();

    expect(fakeRoom.localParticipant.publishData).toHaveBeenCalledTimes(1);
    const [payload, options] = fakeRoom.localParticipant.publishData.calls.mostRecent().args;
    const decoded = JSON.parse(new TextDecoder().decode(payload));
    expect(decoded.senderName).toBe('Ada');
    expect(decoded.text).toBe('hello there');
    expect(options).toEqual({ reliable: true });
    expect(component.messages().length).toBe(1);
    expect(component.draft).toBe('');
  });

  it('does not send an empty or whitespace-only message', () => {
    component.draft = '   ';

    component.send();

    expect(fakeRoom.localParticipant.publishData).not.toHaveBeenCalled();
  });

  it('appends an incoming message received over the data channel', () => {
    const handler = fakeRoom.on.calls.argsFor(0)[1] as (payload: Uint8Array) => void;
    const payload = new TextEncoder().encode(JSON.stringify({ senderName: 'Bob', text: 'hi', ts: 123 }));

    handler(payload);

    expect(component.messages()).toEqual([{ senderName: 'Bob', text: 'hi', ts: 123 }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `packages/web/`): `npm test -- meeting-chat.component.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

```typescript
// packages/web/src/app/meeting-room/meeting-chat/meeting-chat.component.ts
import { Component, OnDestroy, OnInit, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Room, RoomEvent } from 'livekit-client';

interface MeetingChatMessage {
  senderName: string;
  text: string;
  ts: number;
}

@Component({
  selector: 'app-meeting-chat',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  templateUrl: './meeting-chat.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './meeting-chat.component.css',
})
export class MeetingChatComponent implements OnInit, OnDestroy {
  room = input.required<Room | undefined>();
  displayName = input.required<string>();

  messages = signal<MeetingChatMessage[]>([]);
  draft = '';

  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private onDataReceived = (payload: Uint8Array): void => {
    try {
      const message = JSON.parse(this.decoder.decode(payload)) as MeetingChatMessage;
      this.messages.update((list) => [...list, message]);
    } catch {
      // Ignore a malformed payload from a misbehaving client - never crash the chat panel over it.
    }
  };

  ngOnInit(): void {
    this.room()?.on(RoomEvent.DataReceived, this.onDataReceived);
  }

  ngOnDestroy(): void {
    this.room()?.off(RoomEvent.DataReceived, this.onDataReceived);
  }

  send(): void {
    const text = this.draft.trim();
    const room = this.room();
    if (!text || !room) {
      return;
    }
    const message: MeetingChatMessage = { senderName: this.displayName(), text, ts: Date.now() };
    room.localParticipant.publishData(this.encoder.encode(JSON.stringify(message)), { reliable: true });
    this.messages.update((list) => [...list, message]);
    this.draft = '';
  }
}
```

- [ ] **Step 4: Write the template**

```html
<!-- packages/web/src/app/meeting-room/meeting-chat/meeting-chat.component.html -->
<div class="meeting-chat">
  <div class="meeting-chat-messages">
    @for (message of messages(); track message.ts) {
      <div class="meeting-chat-message">
        <strong>{{ message.senderName }}:</strong> {{ message.text }}
      </div>
    }
  </div>
  <div class="meeting-chat-input">
    <input
      type="text"
      [(ngModel)]="draft"
      (keydown.enter)="send()"
      [placeholder]="'meeting_room.chat_placeholder' | translate"
    />
    <button class="btn btn-sm btn-primary" (click)="send()">{{ 'meeting_room.send' | translate }}</button>
  </div>
</div>
```

- [ ] **Step 5: Add a minimal stylesheet**

```css
/* packages/web/src/app/meeting-room/meeting-chat/meeting-chat.component.css */
.meeting-chat {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  background: #fff;
  color: #000;
  display: flex;
  flex-direction: column;
}
.meeting-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.meeting-chat-input {
  display: flex;
  padding: 8px;
  gap: 4px;
}
.meeting-chat-input input {
  flex: 1;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run (from `packages/web/`): `npm test -- meeting-chat.component.spec.ts`
Expected: PASS.

- [ ] **Step 7: Re-run Task 7's test now that MeetingChatComponent is real**

Run (from `packages/web/`): `npm test -- meeting-room.component.spec.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/app/meeting-room/meeting-chat
git commit -m "feat(meeting-room): add ephemeral LiveKit data-channel chat"
```

---

## Task 9: Host meeting-link management UI

**Files:**
- Modify: `packages/web/src/app/services/data.service.ts`
- Create: `packages/web/src/app/pages/meeting-links/meeting-links-manager.component.ts`
- Create: `packages/web/src/app/pages/meeting-links/meeting-links-manager.component.html`
- Create: `packages/web/src/app/pages/meeting-links/meeting-links-manager.component.css`
- Create: `packages/web/src/app/pages/meeting-links/meeting-links-manager.component.spec.ts`
- Modify: `packages/web/src/app/pages/pages-routing.module.ts`
- Modify: `packages/web/src/assets/i18n/en.json`

**Interfaces:**
- Consumes: `DataService` (extended below), `AuthenticationService.authDataSignal()` (for the host's own display name when joining), `MeetingRoomComponent` (Task 7).
- Produces: route `pages/meeting-links`, `DataService.createMeetingLink`, `listMeetingLinks`, `revokeMeetingLink`.

Important constraint carried over from the spec: the raw token is only ever returned by the **create** response — `GET /meeting-links` never re-exposes it (Task 2). So a shareable link can only be shown/copied right after creation; existing rows in the list only offer "Revoke" (and "Join" for the host's own use, via the *authenticated* `/api/token` route, which doesn't need the raw token at all — just the `roomName`).

- [ ] **Step 1: Add the remaining DataService methods**

In `packages/web/src/app/services/data.service.ts`, add:

```typescript
    createMeetingLink(data: { title?: string; expiresAt?: string }) {
        return this.http.post<{ id: number; token: string; roomName: string; title: string | null; expiresAt: string | null }>(
            this.apiHost + '/meeting-links',
            data,
        );
    }
    listMeetingLinks() {
        return this.http.get<{ id: number; title: string | null; roomName: string; expiresAt: string | null; revokedAt: string | null; createdAt: string }[]>(
            this.apiHost + '/meeting-links',
        );
    }
    revokeMeetingLink(id: number) {
        return this.http.delete<void>(this.apiHost + '/meeting-links/' + id);
    }
```

- [ ] **Step 2: Write the failing component test**

```typescript
// packages/web/src/app/pages/meeting-links/meeting-links-manager.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { MeetingLinksManagerComponent } from './meeting-links-manager.component';
import { DataService } from '../../services/data.service';
import { AuthenticationService } from '../../services/auth.service';

describe('MeetingLinksManagerComponent', () => {
  let component: MeetingLinksManagerComponent;
  let fixture: ComponentFixture<MeetingLinksManagerComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;

  const existingLink = { id: 1, title: 'Standup', roomName: 'meeting-abc', expiresAt: null, revokedAt: null, createdAt: '2026-08-27T00:00:00.000Z' };

  beforeEach(async () => {
    dataServiceSpy = jasmine.createSpyObj('DataService', ['createMeetingLink', 'listMeetingLinks', 'revokeMeetingLink', 'sendToken']);
    dataServiceSpy.listMeetingLinks.and.returnValue(of([existingLink]));

    await TestBed.configureTestingModule({
      imports: [MeetingLinksManagerComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataService, useValue: dataServiceSpy },
        { provide: AuthenticationService, useValue: { authDataSignal: () => ({ firstName: 'Ada', lastName: 'Lovelace' }) } },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'warning']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MeetingLinksManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the host\'s existing links on init', () => {
    expect(component.links()).toEqual([existingLink]);
  });

  it('creating a link shows the one-time shareable URL and refreshes the list', () => {
    dataServiceSpy.createMeetingLink.and.returnValue(of({ id: 2, token: 'plain-token', roomName: 'meeting-def', title: 'Retro', expiresAt: null }));
    component.titleDraft = 'Retro';

    component.create();

    expect(dataServiceSpy.createMeetingLink).toHaveBeenCalledWith({ title: 'Retro', expiresAt: undefined });
    expect(component.justCreatedLink()).toBe(`${window.location.origin}/meet/plain-token`);
    expect(dataServiceSpy.listMeetingLinks).toHaveBeenCalledTimes(2);
  });

  it('revoking a link calls the service and refreshes the list', () => {
    dataServiceSpy.revokeMeetingLink.and.returnValue(of(undefined));

    component.revoke(1);

    expect(dataServiceSpy.revokeMeetingLink).toHaveBeenCalledWith(1);
    expect(dataServiceSpy.listMeetingLinks).toHaveBeenCalledTimes(2);
  });

  it('joining an existing link mints a host LiveKit token for that roomName', () => {
    dataServiceSpy.sendToken.and.returnValue(of({ token: 'host-livekit-jwt' }));

    component.joinOwnMeeting(existingLink);

    expect(dataServiceSpy.sendToken).toHaveBeenCalledWith('/api/token', { roomName: 'meeting-abc', participantName: 'Ada-Lovelace' });
    expect(component.activeRoom()).toEqual({ livekitToken: 'host-livekit-jwt', roomName: 'meeting-abc', displayName: 'Ada-Lovelace' });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run (from `packages/web/`): `npm test -- meeting-links-manager.component.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the component**

```typescript
// packages/web/src/app/pages/meeting-links/meeting-links-manager.component.ts
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { DataService } from '../../services/data.service';
import { AuthenticationService } from '../../services/auth.service';
import { MeetingRoomComponent } from '../../meeting-room/meeting-room.component';

interface MeetingLinkRow {
  id: number;
  title: string | null;
  roomName: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface HostConnection {
  livekitToken: string;
  roomName: string;
  displayName: string;
}

@Component({
  selector: 'app-meeting-links-manager',
  standalone: true,
  imports: [FormsModule, TranslateModule, MeetingRoomComponent],
  templateUrl: './meeting-links-manager.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './meeting-links-manager.component.css',
})
export class MeetingLinksManagerComponent implements OnInit {
  private dataService = inject(DataService);
  private auth = inject(AuthenticationService);
  private toastr = inject(ToastrService);

  links = signal<MeetingLinkRow[]>([]);
  justCreatedLink = signal<string | null>(null);
  activeRoom = signal<HostConnection | null>(null);
  titleDraft = '';
  expiresAtDraft = '';

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.dataService.listMeetingLinks().subscribe((links) => this.links.set(links));
  }

  create(): void {
    const expiresAt = this.expiresAtDraft ? new Date(this.expiresAtDraft).toISOString() : undefined;
    this.dataService.createMeetingLink({ title: this.titleDraft || undefined, expiresAt }).subscribe((created) => {
      this.justCreatedLink.set(`${window.location.origin}/meet/${created.token}`);
      this.titleDraft = '';
      this.expiresAtDraft = '';
      this.refresh();
    });
  }

  revoke(id: number): void {
    this.dataService.revokeMeetingLink(id).subscribe(() => this.refresh());
  }

  async copyJustCreatedLink(): Promise<void> {
    const url = this.justCreatedLink();
    if (!url) {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      this.toastr.success('Link copied');
    } catch {
      this.toastr.warning('Could not copy link');
    }
  }

  joinOwnMeeting(link: MeetingLinkRow): void {
    const user = this.auth.authDataSignal();
    const participantName = `${user.firstName}-${user.lastName}`;
    this.dataService.sendToken('/api/token', { roomName: link.roomName, participantName }).subscribe((result) => {
      this.activeRoom.set({ livekitToken: result.token, roomName: link.roomName, displayName: participantName });
    });
  }

  onLeaveOwnMeeting(): void {
    this.activeRoom.set(null);
  }
}
```

- [ ] **Step 5: Write the template**

```html
<!-- packages/web/src/app/pages/meeting-links/meeting-links-manager.component.html -->
@if (activeRoom()) {
  <app-meeting-room
    [livekitToken]="activeRoom()!.livekitToken"
    [roomName]="activeRoom()!.roomName"
    [displayName]="activeRoom()!.displayName"
    (leaveRoomOutput)="onLeaveOwnMeeting()"
  ></app-meeting-room>
} @else {
  <div class="meeting-links-manager">
    <h2>{{ 'meeting_links.title' | translate }}</h2>

    <div class="create-form">
      <input type="text" [(ngModel)]="titleDraft" [placeholder]="'meeting_links.name_placeholder' | translate" />
      <input type="datetime-local" [(ngModel)]="expiresAtDraft" />
      <button class="btn btn-primary" (click)="create()">{{ 'meeting_links.create' | translate }}</button>
    </div>

    @if (justCreatedLink()) {
      <div class="just-created-banner">
        <input type="text" [value]="justCreatedLink()" readonly />
        <button class="btn btn-sm btn-outline-secondary" (click)="copyJustCreatedLink()">
          {{ 'meeting_links.copy' | translate }}
        </button>
      </div>
    }

    <table class="meeting-links-table">
      <tbody>
        @for (link of links(); track link.id) {
          <tr [class.revoked]="link.revokedAt">
            <td>{{ link.title || ('guest_meeting.untitled' | translate) }}</td>
            <td>{{ link.revokedAt ? ('meeting_links.revoked' | translate) : ('meeting_links.active' | translate) }}</td>
            <td>
              @if (!link.revokedAt) {
                <button class="btn btn-sm btn-outline-primary" (click)="joinOwnMeeting(link)">
                  {{ 'meeting_links.join' | translate }}
                </button>
                <button class="btn btn-sm btn-outline-danger" (click)="revoke(link.id)">
                  {{ 'meeting_links.revoke' | translate }}
                </button>
              }
            </td>
          </tr>
        }
      </tbody>
    </table>
  </div>
}
```

- [ ] **Step 6: Add a minimal stylesheet**

```css
/* packages/web/src/app/pages/meeting-links/meeting-links-manager.component.css */
.meeting-links-manager {
  padding: 16px;
}
.create-form {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.just-created-banner {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.just-created-banner input {
  flex: 1;
}
tr.revoked {
  opacity: 0.5;
}
```

- [ ] **Step 7: Add translation keys**

In `packages/web/src/assets/i18n/en.json`, add:

```json
  "meeting_links": {
    "title": "Meeting links",
    "name_placeholder": "Meeting name (optional)",
    "create": "Create link",
    "copy": "Copy",
    "active": "Active",
    "revoked": "Revoked",
    "join": "Join",
    "revoke": "Revoke"
  },
```

- [ ] **Step 8: Register the pages route**

In `packages/web/src/app/pages/pages-routing.module.ts`, add to the `children` array:

```typescript
      {
        path: 'meeting-links',
        loadComponent: () => import('./meeting-links/meeting-links-manager.component').then(module => module.MeetingLinksManagerComponent),
      },
```

- [ ] **Step 9: Run test to verify it passes**

Run (from `packages/web/`): `npm test -- meeting-links-manager.component.spec.ts`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add packages/web/src/app/services/data.service.ts packages/web/src/app/pages/meeting-links packages/web/src/app/pages/pages-routing.module.ts packages/web/src/assets/i18n/en.json
git commit -m "feat(meeting-links): add host meeting-link management UI"
```

---

## Task 10: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Backend — full suite**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 24.19.0
npm test
```
Expected: all pass, including the new `meeting-links` unit and e2e specs.

- [ ] **Step 2: Backend lint**

```bash
npm run lint
```
Expected: no new violations.

- [ ] **Step 3: Frontend — full suite**

```bash
cd packages/web && npm test
```
Expected: all pass, including the four new component specs.

- [ ] **Step 4: Frontend lint**

```bash
cd packages/web && npm run lint
```
Expected: no new violations beyond `eslint-suppressions.json`'s existing backlog. If a rule you touched is now fully clean in a file you edited, regenerate the suppressions file per `AGENTS.md`:
```bash
./node_modules/.bin/eslint "src/**/*.ts" "src/**/*.html" --suppress-all
```

- [ ] **Step 5: Manual smoke test**

Start the backend (`npm run start:dev` from repo root) and frontend (`npm start` from `packages/web/`). As a logged-in user, go to `pages/meeting-links`, create a link, copy the shown URL. Open that URL in a private/incognito window (no session): confirm the guest landing page loads, shows the title/host name, accepts a display name, and joins the call with working audio/video, screen share, and chat. Back in the original window, confirm the host can also join the same room via "Join" and both sides see/hear each other and can chat. Confirm navigating the guest window to any other `pages/*` URL still redirects to login (guests never gain platform access).

- [ ] **Step 6: No commit** — this task only verifies prior commits; nothing new to stage.

---

## Post-plan note

Per this repo's workflow (`AGENTS.md`), squash this branch (`feature/guest-meeting-links`) into a single commit before merging to `main`, and confirm with the user before any push.
