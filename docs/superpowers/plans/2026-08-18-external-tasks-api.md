# External Tasks API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Post-implementation correction:** every `/api/v1/tasks` reference below
> was written before noticing `main.ts`'s global route prefix
> (`/api/v1`, applied to every controller). The actual implemented route
> is `@Controller('external/tasks')`, i.e. **`/api/v1/external/tasks`** -
> not the doubled-up `/api/v1/api/v1/tasks` a literal
> `@Controller('external/tasks')` would have produced.

**Goal:** External tools can authenticate with a personal API token (like a
Jira/GitHub personal access token) to list tasks and create a new task with
a phase assignment, without needing an interactive login session or a
WebSocket connection.

**Architecture:** Two new, additive NestJS modules. `ApiTokensModule` lets a
logged-in user (existing JWT session) generate/list/revoke personal API
tokens (SHA-256 hash stored, plaintext shown once). `ExternalTasksModule`
exposes `GET /api/v1/tasks` and `POST /api/v1/tasks`, guarded by a new
`ApiTokenGuard` that resolves a token to its owning `Users` row and sets
`request.user` — so every existing service that already takes a `Users`
param (`TasksService`, etc.) works unchanged. No changes to the internal
`TasksGateway` or `/tasks` REST endpoints.

**Tech Stack:** NestJS, TypeORM + PostgreSQL, Jest + `@automock/jest` (unit
tests), Node's built-in `crypto` module for token hashing.

**Spec:** `docs/superpowers/specs/2026-08-18-external-tasks-api-design.md`

## Global Constraints

- Node >= 22 required for backend commands: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0` before any `npm`/`npx` backend command.
- Conventional Commits, no `Co-Authored-By` trailer, no Jira prefix (this repo's AGENTS.md).
- Token hashing uses Node's built-in `crypto.createHash('sha256')` — **not** `CryptoService`/bcrypt. bcrypt's salted output is different every time it's called on the same input, so it can't be used for a `WHERE token = ?` lookup; SHA-256 is deterministic, which is what a token-lookup-by-hash needs. `CryptoService` stays reserved for password hashing/comparison, unchanged.
- Plaintext tokens are never stored and never logged. Only the SHA-256 hash lives in the DB. The plaintext is returned exactly once, in the `POST /api-tokens` response body.
- `ApiTokenGuard` is applied only to `ExternalTasksController` via `@UseGuards(ApiTokenGuard)` — it is **not** registered as a global `APP_GUARD`. The existing global `AuthGuard`/`RolesGuard` are untouched.
- `POST /api/v1/tasks` never trusts a client-supplied `projectId` or `createdBy`/`createdByName` — `projectId` is derived server-side from `phaseId`, and `createdBy`/`createdByName` come from `request.user` (the token's owner).
- No local Postgres is available in this environment (`docker ps` fails — no daemon running), so the migration in Task 1 cannot be executed against a real database here. Verify it by matching the exact syntax pattern of the existing `migrations/add-task-comments-table/` migration and confirming `nest build` compiles; do not attempt to actually run `npm run migration:run`.
- Every new function/method gets a real test exercising actual behavior (mock only injected dependencies, never the function under test) — this repo's established TDD convention (see `AGENTS.md`).

---

### Task 1: `ApiToken` entity + migration

**Files:**
- Create: `src/resources/api-tokens/entities/api-token.entity.ts`
- Create: `migrations/add-api-tokens-table/<timestamp>-AddApiTokensTable.ts`

**Interfaces:**
- Produces: `ApiToken` entity (`id`, `token`, `userId`, `name`, `createdAt`, `lastUsedAt`, `user` relation), consumed by every later task.

- [ ] **Step 1: Write the entity**

```ts
// src/resources/api-tokens/entities/api-token.entity.ts
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Users } from '../../users/entities/users.entity';

@Index('apiTokens_users_id_fk', ['userId'], {})
@Entity('apiTokens')
export class ApiToken {
    @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
        id: number;

    @Column('varchar', { name: 'token', length: 64, unique: true })
        token: string;

    @Column('int', { name: 'userId' })
        userId: number;

    @Column('varchar', { name: 'name', length: 250 })
        name: string;

    @CreateDateColumn({ name: 'createdAt' })
        createdAt: Date;

    @Column('timestamp', { name: 'lastUsedAt', nullable: true })
        lastUsedAt: Date | null;

    @ManyToOne(() => Users, { eager: true })
    @JoinColumn([{ name: 'userId', referencedColumnName: 'id' }])
        user: Users;
}
```

- [ ] **Step 2: Write the migration**

Pick a timestamp one greater than the most recent existing migration (check
`ls migrations` and use the highest existing prefix + 1000000 to keep
ordering unambiguous — as of this plan the latest is
`1786973000000` from `add-task-comments-table`, so use `1786974000000`).

```ts
// migrations/add-api-tokens-table/1786974000000-AddApiTokensTable.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiTokensTable1786974000000 implements MigrationInterface {
    name = 'AddApiTokensTable1786974000000'

    public async up (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "apiTokens" (
                "id" SERIAL NOT NULL,
                "token" varchar(64) NOT NULL,
                "userId" integer NOT NULL,
                "name" varchar(250) NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "lastUsedAt" TIMESTAMP,
                CONSTRAINT "PK_apiTokens_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_apiTokens_token" UNIQUE ("token"),
                CONSTRAINT "FK_apiTokens_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "apiTokens_users_id_fk" ON "apiTokens" ("userId")`);
    }

    public async down (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "apiTokens_users_id_fk"`);
        await queryRunner.query(`DROP TABLE "apiTokens"`);
    }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npm run build`
Expected: succeeds, no TS errors. (No local Postgres available to actually
run the migration in this environment — see Global Constraints.)

- [ ] **Step 4: Commit**

```bash
git add src/resources/api-tokens/entities/api-token.entity.ts migrations/add-api-tokens-table/
git commit -m "feat(api-tokens): add ApiToken entity and migration"
```

---

### Task 2: Token hashing utility + `ApiTokensRepository`/`ApiTokensService`

**Files:**
- Create: `src/resources/api-tokens/utils/hash-token.ts`
- Create: `src/resources/api-tokens/api-tokens.repository.ts`
- Create: `src/resources/api-tokens/api-tokens.service.ts`
- Test: `test/unit/resources/api-tokens/hash-token.unit.spec.ts`
- Test: `test/unit/resources/api-tokens/api-tokens.service.unit.spec.ts`

**Interfaces:**
- Produces: `generateApiToken(): { plaintext: string; hash: string }`,
  `hashApiToken(plaintext: string): string`, both from `hash-token.ts`.
- Produces: `ApiTokensService.createToken(user: Users, name: string): Promise<{ id: number; name: string; token: string; createdAt: Date }>`
  (named `createToken`, not `create` - `ApiTokensService` extends
  `BaseAbstractService<ApiToken>`, whose inherited `create(data, user?): Promise<ApiToken>`
  signature isn't compatible with this method's params/return shape; TS
  caught this as a real override error during implementation),
  `ApiTokensService.findAllForUser(userId: number): Promise<ApiToken[]>`,
  `ApiTokensService.revoke(id: number, userId: number): Promise<void>` (throws `NotFoundException` if not owned by `userId`).
  Consumed by `ApiTokensController` in Task 3.

- [ ] **Step 1: Write the failing test for the hashing utility**

```ts
// test/unit/resources/api-tokens/hash-token.unit.spec.ts
import { generateApiToken, hashApiToken } from '../../../../src/resources/api-tokens/utils/hash-token';

describe('hash-token', () => {
    describe('generateApiToken', () => {
        it('produces a 64-character hex plaintext token', () => {
            const { plaintext } = generateApiToken();

            expect(plaintext).toMatch(/^[0-9a-f]{64}$/);
        });

        it('produces a hash matching hashApiToken(plaintext)', () => {
            const { plaintext, hash } = generateApiToken();

            expect(hash).toBe(hashApiToken(plaintext));
        });

        it('generates different tokens on each call', () => {
            const first = generateApiToken();
            const second = generateApiToken();

            expect(first.plaintext).not.toBe(second.plaintext);
        });
    });

    describe('hashApiToken', () => {
        it('is deterministic - the same input always hashes the same way', () => {
            const hashA = hashApiToken('some-token-value');
            const hashB = hashApiToken('some-token-value');

            expect(hashA).toBe(hashB);
        });

        it('produces a 64-character hex SHA-256 digest', () => {
            const hash = hashApiToken('some-token-value');

            expect(hash).toMatch(/^[0-9a-f]{64}$/);
        });
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest-unit.json test/unit/resources/api-tokens/hash-token.unit.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the hashing utility**

```ts
// src/resources/api-tokens/utils/hash-token.ts
import { createHash, randomBytes } from 'crypto';

export function hashApiToken (plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex');
}

export function generateApiToken (): { plaintext: string; hash: string } {
    const plaintext = randomBytes(32).toString('hex');
    return { plaintext, hash: hashApiToken(plaintext) };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run the same command as Step 2.
Expected: PASS, 5 tests.

- [ ] **Step 5: Write the failing test for `ApiTokensService`**

```ts
// test/unit/resources/api-tokens/api-tokens.service.unit.spec.ts
import { TestBed } from '@automock/jest';
import { NotFoundException } from '@nestjs/common';
import { ApiTokensService } from '../../../../src/resources/api-tokens/api-tokens.service';
import { ApiTokensRepository } from '../../../../src/resources/api-tokens/api-tokens.repository';
import { ApiToken } from '../../../../src/resources/api-tokens/entities/api-token.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { hashApiToken } from '../../../../src/resources/api-tokens/utils/hash-token';

describe('ApiTokensService', () => {
    let service: ApiTokensService;
    let repository: jest.Mocked<ApiTokensRepository>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(ApiTokensService).compile();
        service = unit;
        repository = unitRef.get(ApiTokensRepository);
    });

    describe('createToken', () => {
        it('stores a hash, not the plaintext, and returns the plaintext once', async () => {
            const user = { id: 7 } as Users;
            repository.create.mockImplementation(async (data: Partial<ApiToken>) => ({ ...data, id: 1, createdAt: new Date() } as ApiToken));

            const result = await service.createToken(user, 'Zapier integration');

            const [savedData] = repository.create.mock.calls[0];
            expect(savedData.token).toBe(hashApiToken(result.token));
            expect(savedData.token).not.toBe(result.token);
            expect(savedData.userId).toBe(7);
            expect(savedData.name).toBe('Zapier integration');
            expect(result.token).toMatch(/^[0-9a-f]{64}$/);
        });
    });

    describe('findAllForUser', () => {
        it('delegates to the repository, keyed by userId', async () => {
            const tokens = [{ id: 1, userId: 7, name: 'CI' }] as ApiToken[];
            repository.findAllForUser.mockResolvedValue(tokens);

            const result = await service.findAllForUser(7);

            expect(repository.findAllForUser).toHaveBeenCalledWith(7);
            expect(result).toBe(tokens);
        });
    });

    describe('revoke', () => {
        it('deletes the token when owned by the caller', async () => {
            repository.findOneByCondition.mockResolvedValue({ id: 1, userId: 7 } as ApiToken);

            await service.revoke(1, 7);

            expect(repository.delete).toHaveBeenCalledWith(1);
        });

        it('throws NotFoundException when the token does not belong to the caller', async () => {
            repository.findOneByCondition.mockResolvedValue({ id: 1, userId: 999 } as ApiToken);

            await expect(service.revoke(1, 7)).rejects.toThrow(NotFoundException);
            expect(repository.delete).not.toHaveBeenCalled();
        });

        it('throws NotFoundException when the token does not exist', async () => {
            repository.findOneByCondition.mockResolvedValue(null);

            await expect(service.revoke(1, 7)).rejects.toThrow(NotFoundException);
        });
    });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest-unit.json test/unit/resources/api-tokens/api-tokens.service.unit.spec.ts`
Expected: FAIL — modules not found.

- [ ] **Step 7: Write `ApiTokensRepository`**

```ts
// src/resources/api-tokens/api-tokens.repository.ts
import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiToken } from './entities/api-token.entity';

export class ApiTokensRepository extends BaseAbstractRepository<ApiToken> {
    constructor (
        @InjectRepository(ApiToken)
        private readonly apiTokensRepository: Repository<ApiToken>
    ) {
        super(apiTokensRepository);
    }

    findAllForUser (userId: number): Promise<ApiToken[]> {
        return this.apiTokensRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    findByTokenHash (hash: string): Promise<ApiToken> {
        return this.apiTokensRepository.findOne({ where: { token: hash } });
    }

    touchLastUsed (id: number): Promise<void> {
        return this.apiTokensRepository.update(id, { lastUsedAt: new Date() }).then(() => undefined);
    }
}
```

- [ ] **Step 8: Write `ApiTokensService`**

```ts
// src/resources/api-tokens/api-tokens.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { ApiTokensRepository } from './api-tokens.repository';
import { ApiToken } from './entities/api-token.entity';
import { Users } from '../users/entities/users.entity';
import { generateApiToken } from './utils/hash-token';

@Injectable()
export class ApiTokensService extends BaseAbstractService<ApiToken> {
    constructor (
        protected readonly repository: ApiTokensRepository
    ) {
        super(repository, null);
        this.currentRepository = repository;
    }

    async create (user: Users, name: string): Promise<{ id: number; name: string; token: string; createdAt: Date }> {
        const { plaintext, hash } = generateApiToken();
        const saved = await this.repository.create({ token: hash, userId: user.id, name });
        return { id: saved.id, name: saved.name, token: plaintext, createdAt: saved.createdAt };
    }

    findAllForUser (userId: number): Promise<ApiToken[]> {
        return this.repository.findAllForUser(userId);
    }

    async revoke (id: number, userId: number): Promise<void> {
        const token = await this.repository.findOneByCondition({ id } as never);
        if (!token || token.userId !== userId) {
            throw new NotFoundException('API token not found');
        }
        await this.repository.delete(id);
    }
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run the same command as Step 6.
Expected: PASS, 6 tests (3 create/findAllForUser/revoke describe blocks).

- [ ] **Step 10: Commit**

```bash
git add src/resources/api-tokens/utils/ src/resources/api-tokens/api-tokens.repository.ts src/resources/api-tokens/api-tokens.service.ts test/unit/resources/api-tokens/
git commit -m "feat(api-tokens): add token hashing utility and ApiTokensService"
```

---

### Task 3: `ApiTokensController` + `ApiTokensModule`

**Files:**
- Create: `src/resources/api-tokens/dto/create-api-token.dto.ts`
- Create: `src/resources/api-tokens/api-tokens.controller.ts`
- Create: `src/resources/api-tokens/api-tokens.module.ts`
- Test: `test/unit/resources/api-tokens/api-tokens.controller.unit.spec.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: `ApiTokensService` (Task 2).
- Produces: `POST /api-tokens`, `GET /api-tokens`, `DELETE /api-tokens/:id` — all protected by the existing global `AuthGuard` (no `@SkipAuth()`), consuming `@User()` exactly like every other authenticated controller in this repo.

- [ ] **Step 1: Write the DTO**

```ts
// src/resources/api-tokens/dto/create-api-token.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateApiTokenDto {
    @IsString()
    @IsNotEmpty()
        name: string;
}
```

- [ ] **Step 2: Write the failing controller test**

```ts
// test/unit/resources/api-tokens/api-tokens.controller.unit.spec.ts
import { TestBed } from '@automock/jest';
import { ApiTokensController } from '../../../../src/resources/api-tokens/api-tokens.controller';
import { ApiTokensService } from '../../../../src/resources/api-tokens/api-tokens.service';
import { ApiToken } from '../../../../src/resources/api-tokens/entities/api-token.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { mockUser } from '../../../shared/users';

describe('ApiTokensController', () => {
    let controller: ApiTokensController;
    let service: jest.Mocked<ApiTokensService>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(ApiTokensController).compile();
        controller = unit;
        service = unitRef.get(ApiTokensService);
    });

    describe('create', () => {
        it('creates a token for the authenticated user', async () => {
            const created = { id: 1, name: 'CI', token: 'abc123', createdAt: new Date() };
            service.createToken.mockResolvedValue(created);

            const result = await controller.create({ name: 'CI' }, mockUser as Users);

            expect(service.createToken).toHaveBeenCalledWith(mockUser, 'CI');
            expect(result).toBe(created);
        });
    });

    describe('findAll', () => {
        it('lists only the authenticated user\'s tokens', async () => {
            const tokens = [{ id: 1, userId: mockUser.id }] as ApiToken[];
            service.findAllForUser.mockResolvedValue(tokens);

            const result = await controller.findAll(mockUser as Users);

            expect(service.findAllForUser).toHaveBeenCalledWith(mockUser.id);
            expect(result).toBe(tokens);
        });
    });

    describe('revoke', () => {
        it('revokes a token owned by the authenticated user', async () => {
            await controller.revoke(5, mockUser as Users);

            expect(service.revoke).toHaveBeenCalledWith(5, mockUser.id);
        });
    });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest-unit.json test/unit/resources/api-tokens/api-tokens.controller.unit.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the controller**

```ts
// src/resources/api-tokens/api-tokens.controller.ts
import { Body, Controller, Delete, Get, ParseIntPipe, Param, Post } from '@nestjs/common';
import { ApiTokensService } from './api-tokens.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { ApiToken } from './entities/api-token.entity';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';

@Controller('api-tokens')
export class ApiTokensController {
    constructor (private readonly apiTokensService: ApiTokensService) {}

    @Post()
    create (
        @Body() createApiTokenDto: CreateApiTokenDto,
        @User() user: Users,
    ) {
        return this.apiTokensService.createToken(user, createApiTokenDto.name);
    }

    @Get()
    findAll (@User() user: Users): Promise<ApiToken[]> {
        return this.apiTokensService.findAllForUser(user.id);
    }

    @Delete(':id')
    revoke (
        @Param('id', ParseIntPipe) id: number,
        @User() user: Users,
    ): Promise<void> {
        return this.apiTokensService.revoke(id, user.id);
    }
}
```

- [ ] **Step 5: Write the module**

```ts
// src/resources/api-tokens/api-tokens.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiTokensController } from './api-tokens.controller';
import { ApiTokensService } from './api-tokens.service';
import { ApiTokensRepository } from './api-tokens.repository';
import { ApiToken } from './entities/api-token.entity';

@Module({
    imports: [TypeOrmModule.forFeature([ApiToken])],
    controllers: [ApiTokensController],
    providers: [ApiTokensService, ApiTokensRepository],
    exports: [ApiTokensRepository],
})
export class ApiTokensModule {}
```

`ApiTokensRepository` is exported because `ApiTokenGuard` (Task 4, in a
different module) needs it directly to look up tokens by hash.

- [ ] **Step 6: Wire the module into `AppModule`**

In `src/app.module.ts`, add the import alongside the other resource module
imports (e.g. next to `TaskCommentsModule`):

```ts
import { ApiTokensModule } from './resources/api-tokens/api-tokens.module';
```

and add `ApiTokensModule` to the `imports` array.

- [ ] **Step 7: Run the test to verify it passes**

Run the same command as Step 3.
Expected: PASS, 3 tests.

- [ ] **Step 8: Run a full build to confirm module wiring compiles**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npm run build`
Expected: succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/resources/api-tokens/dto/ src/resources/api-tokens/api-tokens.controller.ts src/resources/api-tokens/api-tokens.module.ts src/app.module.ts test/unit/resources/api-tokens/api-tokens.controller.unit.spec.ts
git commit -m "feat(api-tokens): add ApiTokensController and wire ApiTokensModule"
```

---

### Task 4: `ApiTokenGuard`

**Files:**
- Create: `src/resources/api-tokens/guards/api-token.guard.ts`
- Test: `test/unit/resources/api-tokens/api-token.guard.unit.spec.ts`

**Interfaces:**
- Consumes: `ApiTokensRepository.findByTokenHash`/`touchLastUsed` (Task 2).
- Produces: `ApiTokenGuard` (a `CanActivate`), consumed by `ExternalTasksController` in Task 7.

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/resources/api-tokens/api-token.guard.unit.spec.ts
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiTokenGuard } from '../../../../src/resources/api-tokens/guards/api-token.guard';
import { ApiTokensRepository } from '../../../../src/resources/api-tokens/api-tokens.repository';
import { ApiToken } from '../../../../src/resources/api-tokens/entities/api-token.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { hashApiToken } from '../../../../src/resources/api-tokens/utils/hash-token';

describe('ApiTokenGuard', () => {
    let guard: ApiTokenGuard;
    let repository: jest.Mocked<Pick<ApiTokensRepository, 'findByTokenHash' | 'touchLastUsed'>>;

    beforeEach(() => {
        repository = {
            findByTokenHash: jest.fn(),
            touchLastUsed: jest.fn().mockResolvedValue(undefined),
        };
        guard = new ApiTokenGuard(repository as unknown as ApiTokensRepository);
    });

    function contextWithAuthHeader (authorization?: string): ExecutionContext {
        const request: Record<string, unknown> = { headers: { authorization } };
        return {
            switchToHttp: () => ({ getRequest: () => request }),
        } as unknown as ExecutionContext;
    }

    it('sets request.user to the token owner for a valid token', async () => {
        const plaintext = 'a'.repeat(64);
        const apiToken = { id: 1, user: { id: 7 } as Users } as ApiToken;
        repository.findByTokenHash.mockResolvedValue(apiToken);
        const request: Record<string, unknown> = { headers: { authorization: `Bearer ${plaintext}` } };
        const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(request.user).toBe(apiToken.user);
        expect(repository.findByTokenHash).toHaveBeenCalledWith(hashApiToken(plaintext));
    });

    it('updates lastUsedAt for a valid token', async () => {
        const apiToken = { id: 42, user: { id: 7 } as Users } as ApiToken;
        repository.findByTokenHash.mockResolvedValue(apiToken);
        const context = contextWithAuthHeader('Bearer ' + 'a'.repeat(64));

        await guard.canActivate(context);

        expect(repository.touchLastUsed).toHaveBeenCalledWith(42);
    });

    it('rejects a missing Authorization header', async () => {
        const context = contextWithAuthHeader(undefined);

        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a header that is not a Bearer token', async () => {
        const context = contextWithAuthHeader('Basic somevalue');

        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an unknown token', async () => {
        repository.findByTokenHash.mockResolvedValue(null);
        const context = contextWithAuthHeader('Bearer ' + 'a'.repeat(64));

        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest-unit.json test/unit/resources/api-tokens/api-token.guard.unit.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the guard**

```ts
// src/resources/api-tokens/guards/api-token.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ApiTokensRepository } from '../api-tokens.repository';
import { hashApiToken } from '../utils/hash-token';

@Injectable()
export class ApiTokenGuard implements CanActivate {
    constructor (private readonly apiTokensRepository: ApiTokensRepository) {}

    async canActivate (context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new UnauthorizedException();
        }

        const apiToken = await this.apiTokensRepository.findByTokenHash(hashApiToken(token));
        if (!apiToken) {
            throw new UnauthorizedException();
        }

        request['user'] = apiToken.user;
        // Fire-and-forget - don't block the request on this write.
        this.apiTokensRepository.touchLastUsed(apiToken.id);

        return true;
    }

    private extractTokenFromHeader (request: Request): string | undefined {
        const [type, token] = request.headers?.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run the same command as Step 2.
Expected: PASS, 5 tests.

- [ ] **Step 5: Register the guard as a provider**

In `src/resources/api-tokens/api-tokens.module.ts`, add `ApiTokenGuard` to
`providers` and `exports` (it's consumed by `ExternalTasksModule` in Task 7,
a different module):

```ts
providers: [ApiTokensService, ApiTokensRepository, ApiTokenGuard],
exports: [ApiTokensRepository, ApiTokenGuard],
```

- [ ] **Step 6: Commit**

```bash
git add src/resources/api-tokens/guards/ src/resources/api-tokens/api-tokens.module.ts test/unit/resources/api-tokens/api-token.guard.unit.spec.ts
git commit -m "feat(api-tokens): add ApiTokenGuard"
```

---

### Task 5: `TasksRepository.findAllFiltered`

**Files:**
- Modify: `src/resources/tasks/tasks.repository.ts`
- Test: `test/unit/resources/tasks/tasks.repository.unit.spec.ts` (create if it doesn't already exist, otherwise extend it)

**Interfaces:**
- Produces: `TasksRepository.findAllFiltered(filters: { projectId?: number; phaseId?: number; status?: string }): Promise<Tasks[]>`, consumed by `ExternalTasksService` in Task 6.

- [ ] **Step 1: Check whether a repository test file already exists**

```bash
ls test/unit/resources/tasks/tasks.repository.unit.spec.ts 2>&1
```

If it exists, read it first and add the new `describe('findAllFiltered', ...)`
block into it rather than replacing the file. If it doesn't exist, create it
fresh with just this one `describe` block (no need to test the existing
`multiReordering` method - out of scope for this plan).

- [ ] **Step 2: Write the failing test**

```ts
    describe('findAllFiltered', () => {
        it('applies projectId, phaseId, and status as an AND-combined where clause', async () => {
            const tasks = [{ id: 1 }] as Tasks[];
            const findSpy = jest.spyOn(repository['tasksRepository'], 'find').mockResolvedValue(tasks);

            const result = await repository.findAllFiltered({ projectId: 3, phaseId: 5, status: 'inProgress' });

            expect(findSpy).toHaveBeenCalledWith({ where: { projectId: 3, phaseId: 5, status: 'inProgress' } });
            expect(result).toBe(tasks);
        });

        it('omits filters that were not provided', async () => {
            const tasks = [{ id: 1 }] as Tasks[];
            const findSpy = jest.spyOn(repository['tasksRepository'], 'find').mockResolvedValue(tasks);

            await repository.findAllFiltered({ projectId: 3 });

            expect(findSpy).toHaveBeenCalledWith({ where: { projectId: 3 } });
        });

        it('returns everything when no filters are provided, matching todays unfiltered GET /tasks behavior', async () => {
            const tasks = [{ id: 1 }] as Tasks[];
            const findSpy = jest.spyOn(repository['tasksRepository'], 'find').mockResolvedValue(tasks);

            await repository.findAllFiltered({});

            expect(findSpy).toHaveBeenCalledWith({ where: {} });
        });
    });
```

Note: this repository is constructed with a real (but test-only)
`Repository<Tasks>` instance via automock/nestjs testing utilities the same
way other repository spec files in this repo do - check
`test/unit/resources/users/users.repository.unit.spec.ts` for the exact
`TestBed`/instantiation pattern already established and match it, rather
than hand-constructing `TasksRepository` directly.

- [ ] **Step 3: Run it to verify it fails**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest-unit.json test/unit/resources/tasks/tasks.repository.unit.spec.ts`
Expected: FAIL — `findAllFiltered is not a function`.

- [ ] **Step 4: Add the method**

In `src/resources/tasks/tasks.repository.ts`, add:

```ts
    findAllFiltered (filters: { projectId?: number; phaseId?: number; status?: string }): Promise<Tasks[]> {
        const where: Record<string, number | string> = {};
        if (filters.projectId !== undefined) {
            where.projectId = filters.projectId;
        }
        if (filters.phaseId !== undefined) {
            where.phaseId = filters.phaseId;
        }
        if (filters.status !== undefined) {
            where.status = filters.status;
        }
        return this.tasksRepository.find({ where });
    }
```

- [ ] **Step 5: Run the test to verify it passes**

Run the same command as Step 3.
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/resources/tasks/tasks.repository.ts test/unit/resources/tasks/tasks.repository.unit.spec.ts
git commit -m "feat(tasks): add findAllFiltered for optional project/phase/status filters"
```

---

### Task 6: `ExternalTasksService`

**Files:**
- Create: `src/resources/external-tasks/dto/create-external-task.dto.ts`
- Create: `src/resources/external-tasks/dto/list-external-tasks-query.dto.ts`
- Create: `src/resources/external-tasks/external-tasks.service.ts`
- Test: `test/unit/resources/external-tasks/external-tasks.service.unit.spec.ts`

**Interfaces:**
- Consumes: `TasksRepository.findAllFiltered` (Task 5), `TasksService.create`
  (existing, unchanged), `TaskPhaseRepository.findByIdWithProject` (new,
  Step 1 below).
- Produces: `TaskPhaseRepository.findByIdWithProject(id: number): Promise<TaskPhase>`.
  `ExternalTasksService.list(filters): Promise<Tasks[]>`,
  `ExternalTasksService.create(dto: CreateExternalTaskDto, user: Users): Promise<Tasks>`,
  consumed by `ExternalTasksController` in Task 7.

- [ ] **Step 1: Write the failing test for `TaskPhaseRepository.findByIdWithProject`**

`TaskPhase.taskProject` is a plain `@ManyToOne` (**not** `eager: true` -
only `TaskPhase.tasks` is eager). `BaseAbstractRepository.findOneByCondition`
calls `this.repository.findOne(options)` directly with no `relations`, so it
would silently return a `TaskPhase` with `taskProject: undefined` - reading
`phase.taskProject.id` on that result crashes. A dedicated method that
explicitly requests the relation is needed.

Check `test/unit/resources/task-phase/task-phase.repository.unit.spec.ts` -
if it exists, extend it; otherwise create it, matching the `TestBed`/
instantiation pattern from `test/unit/resources/users/users.repository.unit.spec.ts`
(same as noted in Task 5).

```ts
    describe('findByIdWithProject', () => {
        it('loads the taskProject relation', async () => {
            const phase = { id: 5, taskProject: { id: 9 } } as TaskPhase;
            const findOneSpy = jest.spyOn(repository['taskPhaseRepository'], 'findOne').mockResolvedValue(phase);

            const result = await repository.findByIdWithProject(5);

            expect(findOneSpy).toHaveBeenCalledWith({ where: { id: 5 }, relations: ['taskProject'] });
            expect(result).toBe(phase);
        });
    });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest-unit.json test/unit/resources/task-phase/task-phase.repository.unit.spec.ts`
Expected: FAIL — `findByIdWithProject is not a function`.

- [ ] **Step 3: Add the method**

In `src/resources/task-phase/task-phase.repository.ts`, add:

```ts
    findByIdWithProject (id: number): Promise<TaskPhase> {
        return this.taskPhaseRepository.findOne({ where: { id }, relations: ['taskProject'] });
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run the same command as Step 2.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/resources/task-phase/task-phase.repository.ts test/unit/resources/task-phase/
git commit -m "feat(task-phase): add findByIdWithProject for resolving a phase's project"
```

- [ ] **Step 6: Write the DTOs**

```ts
// src/resources/external-tasks/dto/create-external-task.dto.ts
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateExternalTaskDto {
    @IsString()
    @IsNotEmpty()
        title: string;

    @IsOptional()
    @IsString()
        description?: string;

    @IsInt()
        phaseId: number;

    @IsOptional()
    @IsString()
        priority?: string;

    @IsOptional()
    @IsString()
        assigneeEmail?: string;
}
```

```ts
// src/resources/external-tasks/dto/list-external-tasks-query.dto.ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class ListExternalTasksQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
        projectId?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
        phaseId?: number;

    @IsOptional()
    @IsString()
        status?: string;
}
```

- [ ] **Step 7: Write the failing test**

```ts
// test/unit/resources/external-tasks/external-tasks.service.unit.spec.ts
import { TestBed } from '@automock/jest';
import { NotFoundException } from '@nestjs/common';
import { ExternalTasksService } from '../../../../src/resources/external-tasks/external-tasks.service';
import { TasksService } from '../../../../src/resources/tasks/tasks.service';
import { TasksRepository } from '../../../../src/resources/tasks/tasks.repository';
import { TaskPhaseRepository } from '../../../../src/resources/task-phase/task-phase.repository';
import { Tasks } from '../../../../src/resources/tasks/entities/task.entity';
import { TaskPhase } from '../../../../src/resources/task-phase/entities/task-phase.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { TaskProject } from '../../../../src/resources/task-project/entities/task-project.entity';

describe('ExternalTasksService', () => {
    let service: ExternalTasksService;
    let tasksService: jest.Mocked<TasksService>;
    let tasksRepository: jest.Mocked<TasksRepository>;
    let taskPhaseRepository: jest.Mocked<TaskPhaseRepository>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(ExternalTasksService).compile();
        service = unit;
        tasksService = unitRef.get(TasksService);
        tasksRepository = unitRef.get(TasksRepository);
        taskPhaseRepository = unitRef.get(TaskPhaseRepository);
    });

    describe('list', () => {
        it('delegates to TasksRepository.findAllFiltered', async () => {
            const tasks = [{ id: 1 }] as Tasks[];
            tasksRepository.findAllFiltered.mockResolvedValue(tasks);

            const result = await service.list({ projectId: 3 });

            expect(tasksRepository.findAllFiltered).toHaveBeenCalledWith({ projectId: 3 });
            expect(result).toBe(tasks);
        });
    });

    describe('create', () => {
        it('derives projectId from the phase and ignores any client-supplied projectId', async () => {
            const phase = { id: 5, taskProject: { id: 9 } as TaskProject } as TaskPhase;
            taskPhaseRepository.findByIdWithProject.mockResolvedValue(phase);
            const user = { id: 7, firstName: 'Jane', lastName: 'Doe' } as Users;
            const created = { id: 1 } as Tasks;
            tasksService.create.mockResolvedValue(created);

            const result = await service.create({ title: 'New task', phaseId: 5 } as never, user);

            expect(tasksService.create).toHaveBeenCalledWith(expect.objectContaining({
                title: 'New task',
                phaseId: 5,
                projectId: 9,
                createdByName: 'Jane Doe',
            }));
            expect(result).toBe(created);
        });

        it('throws NotFoundException for an unknown phaseId', async () => {
            taskPhaseRepository.findByIdWithProject.mockResolvedValue(null);
            const user = { id: 7 } as Users;

            await expect(service.create({ title: 'New task', phaseId: 999 } as never, user))
                .rejects.toThrow(NotFoundException);
            expect(tasksService.create).not.toHaveBeenCalled();
        });
    });
});
```

- [ ] **Step 8: Run it to verify it fails**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest-unit.json test/unit/resources/external-tasks/external-tasks.service.unit.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 9: Write the service**

```ts
// src/resources/external-tasks/external-tasks.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { TasksService } from '../tasks/tasks.service';
import { TasksRepository } from '../tasks/tasks.repository';
import { TaskPhaseRepository } from '../task-phase/task-phase.repository';
import { Tasks } from '../tasks/entities/task.entity';
import { Users } from '../users/entities/users.entity';
import { CreateExternalTaskDto } from './dto/create-external-task.dto';

@Injectable()
export class ExternalTasksService {
    constructor (
        private readonly tasksService: TasksService,
        private readonly tasksRepository: TasksRepository,
        private readonly taskPhaseRepository: TaskPhaseRepository,
    ) {}

    list (filters: { projectId?: number; phaseId?: number; status?: string }): Promise<Tasks[]> {
        return this.tasksRepository.findAllFiltered(filters);
    }

    async create (dto: CreateExternalTaskDto, user: Users): Promise<Tasks> {
        const phase = await this.taskPhaseRepository.findByIdWithProject(dto.phaseId);
        if (!phase) {
            throw new NotFoundException(`TaskPhase ${dto.phaseId} not found`);
        }

        return this.tasksService.create({
            title: dto.title,
            description: dto.description ?? null,
            phaseId: dto.phaseId,
            projectId: phase.taskProject.id,
            priority: dto.priority ?? null,
            assignessEmail: dto.assigneeEmail ?? null,
            createdBy: String(user.id),
            createdByName: `${user.firstName} ${user.lastName}`,
        } as never);
    }
}
```

- [ ] **Step 10: Run the test to verify it passes**

Run the same command as Step 8.
Expected: PASS, 3 tests.

- [ ] **Step 11: Commit**

```bash
git add src/resources/external-tasks/dto/ src/resources/external-tasks/external-tasks.service.ts test/unit/resources/external-tasks/
git commit -m "feat(external-tasks): add ExternalTasksService"
```

---

### Task 7: `ExternalTasksController` + `ExternalTasksModule`

**Files:**
- Create: `src/resources/external-tasks/external-tasks.controller.ts`
- Create: `src/resources/external-tasks/external-tasks.module.ts`
- Test: `test/unit/resources/external-tasks/external-tasks.controller.unit.spec.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: `ExternalTasksService` (Task 6), `ApiTokenGuard` (Task 4, from
  `ApiTokensModule`).
- Produces: `GET /api/v1/tasks`, `POST /api/v1/tasks`.

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/resources/external-tasks/external-tasks.controller.unit.spec.ts
import { TestBed } from '@automock/jest';
import { ExternalTasksController } from '../../../../src/resources/external-tasks/external-tasks.controller';
import { ExternalTasksService } from '../../../../src/resources/external-tasks/external-tasks.service';
import { Tasks } from '../../../../src/resources/tasks/entities/task.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { mockUser } from '../../../shared/users';

describe('ExternalTasksController', () => {
    let controller: ExternalTasksController;
    let service: jest.Mocked<ExternalTasksService>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(ExternalTasksController).compile();
        controller = unit;
        service = unitRef.get(ExternalTasksService);
    });

    describe('findAll', () => {
        it('passes query filters through to the service', async () => {
            const tasks = [{ id: 1 }] as Tasks[];
            service.list.mockResolvedValue(tasks);

            const result = await controller.findAll({ projectId: 3, phaseId: 5, status: 'inProgress' });

            expect(service.list).toHaveBeenCalledWith({ projectId: 3, phaseId: 5, status: 'inProgress' });
            expect(result).toBe(tasks);
        });
    });

    describe('create', () => {
        it('creates a task as the authenticated (token-owning) user', async () => {
            const created = { id: 1 } as Tasks;
            service.create.mockResolvedValue(created);
            const dto = { title: 'New task', phaseId: 5 };

            const result = await controller.create(dto as never, mockUser as Users);

            expect(service.create).toHaveBeenCalledWith(dto, mockUser);
            expect(result).toBe(created);
        });
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest-unit.json test/unit/resources/external-tasks/external-tasks.controller.unit.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the controller**

```ts
// src/resources/external-tasks/external-tasks.controller.ts
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ExternalTasksService } from './external-tasks.service';
import { CreateExternalTaskDto } from './dto/create-external-task.dto';
import { ListExternalTasksQueryDto } from './dto/list-external-tasks-query.dto';
import { Tasks } from '../tasks/entities/task.entity';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';
import { ApiTokenGuard } from '../api-tokens/guards/api-token.guard';
import { SkipAuth } from '../auth/decorators/public.guard';

@Controller('external/tasks')
@UseGuards(ApiTokenGuard)
@SkipAuth()
export class ExternalTasksController {
    constructor (private readonly externalTasksService: ExternalTasksService) {}

    @Get()
    findAll (@Query() query: ListExternalTasksQueryDto): Promise<Tasks[]> {
        return this.externalTasksService.list(query);
    }

    @Post()
    create (
        @Body() createExternalTaskDto: CreateExternalTaskDto,
        @User() user: Users,
    ): Promise<Tasks> {
        return this.externalTasksService.create(createExternalTaskDto, user);
    }
}
```

`@SkipAuth()` opts this controller out of the global `AuthGuard` (which
only understands session JWTs, not API tokens) - `ApiTokenGuard` is the
sole gatekeeper here instead. `@SkipAuth()` bypasses `RolesGuard` too since
that guard is a no-op whenever no `@Roles(...)` decorator is present here,
so nothing else needs to change.

- [ ] **Step 4: Write the module**

```ts
// src/resources/external-tasks/external-tasks.module.ts
import { Module } from '@nestjs/common';
import { ExternalTasksController } from './external-tasks.controller';
import { ExternalTasksService } from './external-tasks.service';
import { TasksModule } from '../tasks/tasks.module';
import { TaskPhaseModule } from '../task-phase/task-phase.module';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';

@Module({
    imports: [TasksModule, TaskPhaseModule, ApiTokensModule],
    controllers: [ExternalTasksController],
    providers: [ExternalTasksService],
})
export class ExternalTasksModule {}
```

Neither `TasksModule` nor `TaskPhaseModule` currently has an `exports`
array at all (confirmed by reading both files while writing this plan), so
this step also adds one to each:

In `src/resources/tasks/tasks.module.ts`, add to the `@Module` decorator:
```ts
    exports: [TasksService, TasksRepository],
```

In `src/resources/task-phase/task-phase.module.ts`, add:
```ts
    exports: [TaskPhaseRepository],
```

- [ ] **Step 5: Wire the module into `AppModule`**

In `src/app.module.ts`, add:

```ts
import { ExternalTasksModule } from './resources/external-tasks/external-tasks.module';
```

and add `ExternalTasksModule` to the `imports` array.

- [ ] **Step 6: Run the test to verify it passes**

Run the same command as Step 2.
Expected: PASS, 2 tests.

- [ ] **Step 7: Run a full build**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npm run build`
Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/resources/external-tasks/external-tasks.controller.ts src/resources/external-tasks/external-tasks.module.ts src/app.module.ts test/unit/resources/external-tasks/external-tasks.controller.unit.spec.ts
git commit -m "feat(external-tasks): add ExternalTasksController and wire ExternalTasksModule"
```

(Also commit any one-line `exports` additions made to `TasksModule`/
`TaskPhaseModule` in Step 4 as part of this same commit.)

---

### Task 8: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full backend suite**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npm run build && npx jest --config ./test/jest.json --testPathIgnorePatterns=e2e 2>&1 | tail -40`
Expected: build succeeds; all tests pass except the one pre-existing,
unrelated failure in `google-calendar.service.spec.ts`.

- [ ] **Step 2: Confirm working tree is clean**

Run: `git status --short`
Expected: no output (everything already committed task-by-task).

- [ ] **Step 3: Manually sanity-check the new surface with curl**

No local Postgres is available in this environment to actually exercise
this end-to-end (see Global Constraints). If a database becomes available
later, verify manually:

```bash
# 1. Log in normally, get a JWT
# 2. POST /api-tokens with that JWT -> capture the plaintext token
# 3. GET /api/v1/tasks with "Authorization: Bearer <api-token>" -> 200
# 4. POST /api/v1/tasks with a real phaseId -> 201, response includes the new task
# 5. POST /api/v1/tasks with a bogus phaseId -> 404
# 6. GET /api/v1/tasks with no Authorization header -> 401
```

Otherwise, note in the final report that this step was skipped for lack of
a local database, and that unit test coverage (Tasks 1-7) is what's
verified in this environment.
