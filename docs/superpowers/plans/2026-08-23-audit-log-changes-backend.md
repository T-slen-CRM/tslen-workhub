# Audit Log Change Tracking (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture field-level, human-readable diffs ("assignee: Oleh Teslenko → John Smith") for every entity mutation — REST or WebSocket-driven — and expose them via a new admin-only `GET /api/v1/audit-log` endpoint. This is the backend half of the feature; the Angular admin viewer is a separate follow-up plan that consumes this endpoint.

**Architecture:** A global TypeORM subscriber diffs every insert/update/delete against the previous DB row. `AsyncLocalStorage` correlates those diffs to the single HTTP request or WS message that caused them — one context-opening entry point per transport (the existing `AuditLogMiddleware` for REST, a new `AuditLogWsInterceptor` for the `tasks` WebSocket gateway). Everything downstream of `AuditLogBufferService` (capped buffer, batched flush) is unchanged from the v1 audit log.

**Tech Stack:** NestJS 10, TypeORM 0.3, Node's built-in `node:async_hooks` (`AsyncLocalStorage` — no new dependency), Jest + `@automock/jest`.

**Spec:** `docs/superpowers/specs/2026-08-23-audit-log-changes-view-design.md`

## Global Constraints

- Node >= 22 — `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0` before any test/build command.
- Conventional Commits, no Jira, no `Co-Authored-By: Claude` trailer (see `AGENTS.md`).
- TypeORM entity columns are camelCase with explicit `name:`.
- 4-space indent, single quotes, space before function-parens, matching existing files; run `npm run lint` (`eslint --fix`) on new/changed files before committing.
- TDD red/green for every behavior; unit tests under `test/unit/<mirrors-src-path>/*.unit.spec.ts`, run via `npm run test:unit`.
- **TypeORM subscriber convention in this codebase** (verified against `company-days-off-rules.subscriber.ts`, `events-by-user.subscriber.ts`, `task-project.subscriber.ts`): `@EventSubscriber()` class (never `@Injectable()`), constructor injects `DataSource` and calls `dataSource.subscribers.push(this)` — that call is the *entire* registration mechanism, nothing else needed (no central subscribers list in `database.module.ts` or `typeOrm.config.ts`). Existing subscribers all scope themselves to one entity via `listenTo()`; this one deliberately omits `listenTo()` so it applies to every entity — a justified, intentional deviation from the narrow per-entity convention, since this is cross-cutting infrastructure, not business logic.
- **WS auth is real, verified**: the global `AuthGuard` (`APP_GUARD`) genuinely runs for `@SubscribeMessage` handlers and sets `client['user']` when the socket handshake carries a JWT — confirmed the frontend's `TaskWebSocketService` (`packages/web/src/app/pages/tasks-list/taskWebSocket.service.ts:14-17`) already sends `extraHeaders: { authorization: 'Bearer ' + jwtToken }` at connection time. `AuthGuard.canActivate` reads the socket via `context.switchToHttp().getRequest()`, not `switchToWs()` — match that convention exactly in the new interceptor, since nothing in this codebase uses `switchToWs()`.
- No TypeORM migrations exist in this repo (schema is `synchronize`-managed in dev) — adding a column to an existing `@Entity` is sufficient, no migration file needed.

---

### Task 1: `AuditContextStorage` — shared per-operation context

**Files:**
- Create: `src/common/audit-context.storage.ts`
- Test: `test/unit/common/audit-context.storage.unit.spec.ts`

**Interfaces:**
- Produces:
  - `interface AuditFieldChange { field: string; from?: unknown; fromLabel?: string | null; to?: unknown; toLabel?: string | null; }`
  - `interface AuditEntityChange { entityName: string; entityId: number | string; action: 'insert' | 'update' | 'delete'; fields: AuditFieldChange[]; }`
  - `runWithAuditContext<T>(fn: () => T): T` — used by `AuditLogMiddleware` (Task 7) and `AuditLogWsInterceptor` (Task 8) to open a context around an entire operation.
  - `pushAuditChange(change: AuditEntityChange): void` — used by `AuditLogSubscriber` (Task 6). No-ops silently if no context is active. Caps at `AUDIT_CONTEXT_MAX_CHANGES` (200), incrementing an internal dropped-count past that instead of growing unbounded.
  - `finalizeAuditChanges(): AuditEntityChange[]` — used by `AuditLogMiddleware`/`AuditLogWsInterceptor` to read the accumulated changes at the end of an operation, appending a `{ entityName: '__truncated__', entityId: 0, action: 'update', fields: [{ field: 'truncated', to: droppedCount }] }` marker if the cap was hit. Returns `[]` if no context is active.

- [ ] **Step 1: Write the failing tests**

```typescript
import { AUDIT_CONTEXT_MAX_CHANGES, finalizeAuditChanges, pushAuditChange, runWithAuditContext } from '../../../src/common/audit-context.storage';

describe('audit-context.storage', () => {
    it('finalizeAuditChanges returns an empty array when no context is active', () => {
        expect(finalizeAuditChanges()).toEqual([]);
    });

    it('pushAuditChange outside a context is a silent no-op', () => {
        expect(() => pushAuditChange({ entityName: 'Tasks', entityId: 1, action: 'update', fields: [] })).not.toThrow();
    });

    it('collects changes pushed during the context and returns them via finalizeAuditChanges', () => {
        const result = runWithAuditContext(() => {
            pushAuditChange({ entityName: 'Tasks', entityId: 1, action: 'update', fields: [{ field: 'title', from: 'a', to: 'b' }] });
            pushAuditChange({ entityName: 'Users', entityId: 2, action: 'insert', fields: [] });
            return finalizeAuditChanges();
        });

        expect(result).toEqual([
            { entityName: 'Tasks', entityId: 1, action: 'update', fields: [{ field: 'title', from: 'a', to: 'b' }] },
            { entityName: 'Users', entityId: 2, action: 'insert', fields: [] },
        ]);
    });

    it('propagates the context across an async continuation (the real-world case: middleware -> next() -> async service/repository calls)', async () => {
        const result = await runWithAuditContext(async () => {
            await Promise.resolve();
            pushAuditChange({ entityName: 'Tasks', entityId: 1, action: 'update', fields: [] });
            await Promise.resolve();
            return finalizeAuditChanges();
        });

        expect(result).toHaveLength(1);
    });

    it('appends a truncation marker once more than AUDIT_CONTEXT_MAX_CHANGES entries are pushed, instead of growing unbounded', () => {
        const result = runWithAuditContext(() => {
            for (let i = 0; i < AUDIT_CONTEXT_MAX_CHANGES + 5; i++) {
                pushAuditChange({ entityName: 'Tasks', entityId: i, action: 'update', fields: [] });
            }
            return finalizeAuditChanges();
        });

        expect(result).toHaveLength(AUDIT_CONTEXT_MAX_CHANGES + 1);
        expect(result[AUDIT_CONTEXT_MAX_CHANGES]).toEqual({
            entityName: '__truncated__', entityId: 0, action: 'update',
            fields: [{ field: 'truncated', to: 5 }],
        });
    });

    it('keeps separate contexts isolated across concurrent operations', async () => {
        const [a, b] = await Promise.all([
            runWithAuditContext(async () => {
                pushAuditChange({ entityName: 'Tasks', entityId: 1, action: 'update', fields: [] });
                await new Promise((resolve) => setTimeout(resolve, 5));
                return finalizeAuditChanges();
            }),
            runWithAuditContext(async () => {
                pushAuditChange({ entityName: 'Users', entityId: 2, action: 'update', fields: [] });
                return finalizeAuditChanges();
            }),
        ]);

        expect(a).toEqual([{ entityName: 'Tasks', entityId: 1, action: 'update', fields: [] }]);
        expect(b).toEqual([{ entityName: 'Users', entityId: 2, action: 'update', fields: [] }]);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- audit-context.storage.unit.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuditFieldChange {
    field: string;
    from?: unknown;
    fromLabel?: string | null;
    to?: unknown;
    toLabel?: string | null;
}

export interface AuditEntityChange {
    entityName: string;
    entityId: number | string;
    action: 'insert' | 'update' | 'delete';
    fields: AuditFieldChange[];
}

interface AuditContextStore {
    changes: AuditEntityChange[];
    droppedChangesCount: number;
}

export const AUDIT_CONTEXT_MAX_CHANGES = 200;

const auditContextStorage = new AsyncLocalStorage<AuditContextStore>();

export function runWithAuditContext<T> (fn: () => T): T {
    return auditContextStorage.run({ changes: [], droppedChangesCount: 0 }, fn);
}

export function pushAuditChange (change: AuditEntityChange): void {
    const store = auditContextStorage.getStore();
    if (!store) {
        return;
    }
    if (store.changes.length >= AUDIT_CONTEXT_MAX_CHANGES) {
        store.droppedChangesCount += 1;
        return;
    }
    store.changes.push(change);
}

export function finalizeAuditChanges (): AuditEntityChange[] {
    const store = auditContextStorage.getStore();
    if (!store) {
        return [];
    }
    const result = [...store.changes];
    if (store.droppedChangesCount > 0) {
        result.push({
            entityName: '__truncated__',
            entityId: 0,
            action: 'update',
            fields: [{ field: 'truncated', to: store.droppedChangesCount }],
        });
    }
    return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- audit-context.storage.unit.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/common/audit-context.storage.ts test/unit/common/audit-context.storage.unit.spec.ts
git commit -m "feat(audit-log): add AsyncLocalStorage-based per-operation audit context"
```

---

### Task 2: `computeFieldDiff` — field-level diff util

**Files:**
- Create: `src/resources/audit-log/audit-log-diff.util.ts`
- Test: `test/unit/resources/audit-log/audit-log-diff.util.unit.spec.ts`

**Interfaces:**
- Produces: `interface RawFieldDiff { field: string; from?: unknown; to?: unknown; }` and `computeFieldDiff(newValues: Record<string, unknown> | undefined, oldValues: Record<string, unknown> | undefined): RawFieldDiff[]` — used by `AuditLogSubscriber` (Task 6). Called with `(newRow, oldRow)` for an update, `(newRow, undefined)` for an insert (every field becomes a `{field, to}` with no `from`), `(undefined, oldRow)` for a delete (every field becomes a `{field, from}` with no `to`).

- [ ] **Step 1: Write the failing tests**

```typescript
import { computeFieldDiff } from '../../../../src/resources/audit-log/audit-log-diff.util';

describe('computeFieldDiff', () => {
    it('returns only the fields that actually changed, for an update', () => {
        const result = computeFieldDiff({ id: 1, title: 'new', phaseId: 5 }, { id: 1, title: 'old', phaseId: 5 });

        expect(result).toEqual([{ field: 'title', from: 'old', to: 'new' }]);
    });

    it('excludes sensitive field names entirely, even when changed', () => {
        const result = computeFieldDiff({ id: 1, password: 'new-hash' }, { id: 1, password: 'old-hash' });

        expect(result).toEqual([]);
    });

    it('treats equal Date instants as unchanged, even as different object instances', () => {
        const result = computeFieldDiff({ id: 1, updatedAt: new Date('2026-01-01T00:00:00Z') }, { id: 1, updatedAt: new Date('2026-01-01T00:00:00Z') });

        expect(result).toEqual([]);
    });

    it('an insert (no oldValues) reports every field as newly set, with no "from"', () => {
        const result = computeFieldDiff({ id: 1, title: 'x' }, undefined);

        expect(result).toEqual([{ field: 'id', to: 1 }, { field: 'title', to: 'x' }]);
    });

    it('a delete (no newValues) reports every field as removed, with no "to"', () => {
        const result = computeFieldDiff(undefined, { id: 1, title: 'x' });

        expect(result).toEqual([{ field: 'id', from: 1 }, { field: 'title', from: 'x' }]);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- audit-log-diff.util.unit.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
const SENSITIVE_KEY_PATTERN = /password|token|secret|apikey/i;

export interface RawFieldDiff {
    field: string;
    from?: unknown;
    to?: unknown;
}

export function computeFieldDiff (
    newValues: Record<string, unknown> | undefined,
    oldValues: Record<string, unknown> | undefined
): RawFieldDiff[] {
    const keys = new Set([
        ...(newValues ? Object.keys(newValues) : []),
        ...(oldValues ? Object.keys(oldValues) : []),
    ]);
    const diffs: RawFieldDiff[] = [];

    for (const key of keys) {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
            continue;
        }
        const hasNew = !!newValues && key in newValues;
        const hasOld = !!oldValues && key in oldValues;

        if (hasNew && hasOld) {
            if (!valuesEqual(oldValues[key], newValues[key])) {
                diffs.push({ field: key, from: oldValues[key], to: newValues[key] });
            }
        } else if (hasNew) {
            diffs.push({ field: key, to: newValues[key] });
        } else if (hasOld) {
            diffs.push({ field: key, from: oldValues[key] });
        }
    }
    return diffs;
}

function valuesEqual (a: unknown, b: unknown): boolean {
    if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
    }
    return a === b;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- audit-log-diff.util.unit.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/resources/audit-log/audit-log-diff.util.ts test/unit/resources/audit-log/audit-log-diff.util.unit.spec.ts
git commit -m "feat(audit-log): add computeFieldDiff for entity change detection"
```

---

### Task 3: `collapseRelationPairs` — assignment-relation collapsing

**Files:**
- Modify: `src/resources/audit-log/audit-log-diff.util.ts`
- Test: `test/unit/resources/audit-log/audit-log-diff.util.unit.spec.ts` (extend)

**Interfaces:**
- Consumes: `AuditEntityChange`, `AuditFieldChange` (Task 1).
- Produces: `collapseRelationPairs(changes: AuditEntityChange[]): AuditEntityChange[]` — used by `AuditLogMiddleware` (Task 7) and `AuditLogWsInterceptor` (Task 8). Merges a delete+insert pair on `TaskUserAssignmentRelation` sharing the same `taskId` into one synthetic `{field: 'assignee', ...}` change on the parent `Tasks` entity change (merging into an existing change for that same `Tasks` id if one is already present, rather than creating a duplicate entry). Insert-only → `from` omitted (new assignment). Delete-only → `to` omitted (unassigned). Non-relation changes pass through untouched.

- [ ] **Step 1: Write the failing tests**

```typescript
import { collapseRelationPairs, computeFieldDiff } from '../../../../src/resources/audit-log/audit-log-diff.util';
import { AuditEntityChange } from '../../../../src/common/audit-context.storage';

describe('collapseRelationPairs', () => {
    it('merges a delete+insert pair on TaskUserAssignmentRelation into one synthetic assignee change on the parent Tasks entity', () => {
        const changes: AuditEntityChange[] = [
            { entityName: 'TaskUserAssignmentRelation', entityId: 101, action: 'delete', fields: [{ field: 'taskId', from: 42 }, { field: 'userId', from: 7, fromLabel: 'Oleh Teslenko' }] },
            { entityName: 'TaskUserAssignmentRelation', entityId: 108, action: 'insert', fields: [{ field: 'taskId', to: 42 }, { field: 'userId', to: 12, toLabel: 'John Smith' }] },
        ];

        const result = collapseRelationPairs(changes);

        expect(result).toEqual([
            { entityName: 'Tasks', entityId: 42, action: 'update', fields: [
                { field: 'assignee', from: 7, fromLabel: 'Oleh Teslenko', to: 12, toLabel: 'John Smith' },
            ] },
        ]);
    });

    it('an insert with no matching delete reads as a new assignment (no "from")', () => {
        const changes: AuditEntityChange[] = [
            { entityName: 'TaskUserAssignmentRelation', entityId: 108, action: 'insert', fields: [{ field: 'taskId', to: 42 }, { field: 'userId', to: 12, toLabel: 'John Smith' }] },
        ];

        expect(collapseRelationPairs(changes)).toEqual([
            { entityName: 'Tasks', entityId: 42, action: 'update', fields: [{ field: 'assignee', to: 12, toLabel: 'John Smith' }] },
        ]);
    });

    it('a delete with no matching insert reads as unassigned (no "to")', () => {
        const changes: AuditEntityChange[] = [
            { entityName: 'TaskUserAssignmentRelation', entityId: 101, action: 'delete', fields: [{ field: 'taskId', from: 42 }, { field: 'userId', from: 7, fromLabel: 'Oleh Teslenko' }] },
        ];

        expect(collapseRelationPairs(changes)).toEqual([
            { entityName: 'Tasks', entityId: 42, action: 'update', fields: [{ field: 'assignee', from: 7, fromLabel: 'Oleh Teslenko' }] },
        ]);
    });

    it('merges the synthetic assignee field into an existing Tasks change for the same task, instead of a duplicate entry', () => {
        const changes: AuditEntityChange[] = [
            { entityName: 'Tasks', entityId: 42, action: 'update', fields: [{ field: 'phaseId', from: 3, to: 5 }] },
            { entityName: 'TaskUserAssignmentRelation', entityId: 108, action: 'insert', fields: [{ field: 'taskId', to: 42 }, { field: 'userId', to: 12, toLabel: 'John Smith' }] },
        ];

        const result = collapseRelationPairs(changes);

        expect(result).toEqual([
            { entityName: 'Tasks', entityId: 42, action: 'update', fields: [
                { field: 'phaseId', from: 3, to: 5 },
                { field: 'assignee', to: 12, toLabel: 'John Smith' },
            ] },
        ]);
    });

    it('leaves unrelated entity changes untouched', () => {
        const changes: AuditEntityChange[] = [
            { entityName: 'Users', entityId: 3, action: 'update', fields: [{ field: 'email', from: 'a@x.com', to: 'b@x.com' }] },
        ];

        expect(collapseRelationPairs(changes)).toEqual(changes);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- audit-log-diff.util.unit.spec.ts`
Expected: 5 new FAILs — `collapseRelationPairs` not exported.

- [ ] **Step 3: Add the implementation** (append to `audit-log-diff.util.ts`)

```typescript
import { AuditEntityChange, AuditFieldChange } from '../../common/audit-context.storage';

interface AssignmentRelationRule {
    entityName: string;
    parentEntityName: string;
    parentIdField: string;
    userIdField: string;
    syntheticFieldName: string;
}

const ASSIGNMENT_RELATION_RULES: AssignmentRelationRule[] = [
    { entityName: 'TaskUserAssignmentRelation', parentEntityName: 'Tasks', parentIdField: 'taskId', userIdField: 'userId', syntheticFieldName: 'assignee' },
];

export function collapseRelationPairs (changes: AuditEntityChange[]): AuditEntityChange[] {
    return ASSIGNMENT_RELATION_RULES.reduce(collapseForRule, changes);
}

function collapseForRule (changes: AuditEntityChange[], rule: AssignmentRelationRule): AuditEntityChange[] {
    const relationChanges = changes.filter((c) => c.entityName === rule.entityName);
    if (relationChanges.length === 0) {
        return changes;
    }
    const others = changes.filter((c) => c.entityName !== rule.entityName);

    const byParent = new Map<string, { inserted?: AuditEntityChange; deleted?: AuditEntityChange }>();
    for (const change of relationChanges) {
        const direction = change.action === 'delete' ? 'from' : 'to';
        const parentId = fieldValue(change, rule.parentIdField, direction);
        if (parentId === undefined) {
            continue;
        }
        const bucket = byParent.get(String(parentId)) ?? {};
        if (change.action === 'insert') {
            bucket.inserted = change;
        }
        if (change.action === 'delete') {
            bucket.deleted = change;
        }
        byParent.set(String(parentId), bucket);
    }

    let result = others;
    for (const [parentId, { inserted, deleted }] of byParent) {
        const syntheticField: AuditFieldChange = { field: rule.syntheticFieldName };
        if (deleted) {
            syntheticField.from = fieldValue(deleted, rule.userIdField, 'from');
            syntheticField.fromLabel = fieldLabel(deleted, rule.userIdField, 'from');
        }
        if (inserted) {
            syntheticField.to = fieldValue(inserted, rule.userIdField, 'to');
            syntheticField.toLabel = fieldLabel(inserted, rule.userIdField, 'to');
        }
        result = mergeChange(result, {
            entityName: rule.parentEntityName,
            entityId: isNaN(Number(parentId)) ? parentId : Number(parentId),
            action: 'update',
            fields: [syntheticField],
        });
    }
    return result;
}

function fieldValue (change: AuditEntityChange, fieldName: string, direction: 'from' | 'to'): unknown {
    return change.fields.find((f) => f.field === fieldName)?.[direction];
}

function fieldLabel (change: AuditEntityChange, fieldName: string, direction: 'from' | 'to'): string | null | undefined {
    const field = change.fields.find((f) => f.field === fieldName);
    return direction === 'from' ? field?.fromLabel : field?.toLabel;
}

function mergeChange (changes: AuditEntityChange[], change: AuditEntityChange): AuditEntityChange[] {
    const existing = changes.find((c) => c.entityName === change.entityName && String(c.entityId) === String(change.entityId));
    if (existing) {
        existing.fields.push(...change.fields);
        return changes;
    }
    return [...changes, change];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- audit-log-diff.util.unit.spec.ts`
Expected: PASS (10 tests total).

- [ ] **Step 5: Commit**

```bash
git add src/resources/audit-log/audit-log-diff.util.ts test/unit/resources/audit-log/audit-log-diff.util.unit.spec.ts
git commit -m "feat(audit-log): collapse assignee add/remove relation pairs into one field change"
```

---

### Task 4: `AuditLogLabelResolverService`

**Files:**
- Create: `src/resources/audit-log/audit-log-label-resolver.service.ts`
- Test: `test/unit/resources/audit-log/audit-log-label-resolver.service.unit.spec.ts`

**Interfaces:**
- Consumes: `UsersRepository.findOne(id): Promise<Users>`, `TaskPhaseRepository.findOne(id): Promise<TaskPhase>`, `TaskProjectRepository.findOne(id): Promise<TaskProject>` (all existing, inherited from `BaseAbstractRepository`).
- Produces: `AuditLogLabelResolverService.resolveLabel(field: string, value: unknown): Promise<string | null>` — used by `AuditLogSubscriber` (Task 6). Returns `null` for a field with no configured resolver, a non-numeric value, a not-found row, or a repository error (never throws).

- [ ] **Step 1: Write the failing tests**

```typescript
import { TestBed } from '@automock/jest';
import { AuditLogLabelResolverService } from '../../../../src/resources/audit-log/audit-log-label-resolver.service';
import { UsersRepository } from '../../../../src/resources/users/users.repository';
import { TaskPhaseRepository } from '../../../../src/resources/task-phase/task-phase.repository';
import { TaskProjectRepository } from '../../../../src/resources/task-project/task-project.repository';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { TaskPhase } from '../../../../src/resources/task-phase/entities/task-phase.entity';

describe('AuditLogLabelResolverService', () => {
    let service: AuditLogLabelResolverService;
    let usersRepository: jest.Mocked<UsersRepository>;
    let taskPhaseRepository: jest.Mocked<TaskPhaseRepository>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(AuditLogLabelResolverService).compile();
        service = unit;
        usersRepository = unitRef.get(UsersRepository);
        taskPhaseRepository = unitRef.get(TaskPhaseRepository);
    });

    it('resolves a userId to "First Last"', async () => {
        usersRepository.findOne.mockResolvedValue({ firstName: 'John', lastName: 'Smith' } as Users);

        expect(await service.resolveLabel('userId', 12)).toBe('John Smith');
        expect(usersRepository.findOne).toHaveBeenCalledWith(12);
    });

    it('resolves a phaseId to the phase name', async () => {
        taskPhaseRepository.findOne.mockResolvedValue({ name: 'In progress' } as TaskPhase);

        expect(await service.resolveLabel('phaseId', 22)).toBe('In progress');
    });

    it('returns null for a field with no configured resolver, without calling any repository', async () => {
        expect(await service.resolveLabel('title', 'anything')).toBeNull();
        expect(usersRepository.findOne).not.toHaveBeenCalled();
    });

    it('returns null for a non-numeric value', async () => {
        expect(await service.resolveLabel('userId', 'not-a-number')).toBeNull();
    });

    it('returns null when the referenced row no longer exists', async () => {
        usersRepository.findOne.mockResolvedValue(null);

        expect(await service.resolveLabel('userId', 999)).toBeNull();
    });

    it('returns null instead of throwing when the repository lookup fails', async () => {
        usersRepository.findOne.mockRejectedValue(new Error('db down'));

        await expect(service.resolveLabel('userId', 12)).resolves.toBeNull();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- audit-log-label-resolver.service.unit.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { TaskPhaseRepository } from '../task-phase/task-phase.repository';
import { TaskProjectRepository } from '../task-project/task-project.repository';

type FieldResolver = (id: number) => Promise<string | null>;

@Injectable()
export class AuditLogLabelResolverService {
    private readonly resolvers: Record<string, FieldResolver>;

    constructor (
        private readonly usersRepository: UsersRepository,
        private readonly taskPhaseRepository: TaskPhaseRepository,
        private readonly taskProjectRepository: TaskProjectRepository,
    ) {
        this.resolvers = {
            userId: (id) => this.usersRepository.findOne(id).then((u) => (u ? `${u.firstName} ${u.lastName}` : null)),
            phaseId: (id) => this.taskPhaseRepository.findOne(id).then((p) => p?.name ?? null),
            projectId: (id) => this.taskProjectRepository.findOne(id).then((p) => p?.name ?? null),
        };
    }

    async resolveLabel (field: string, value: unknown): Promise<string | null> {
        const resolver = this.resolvers[field];
        if (!resolver || typeof value !== 'number') {
            return null;
        }
        try {
            return await resolver(value);
        } catch {
            return null;
        }
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- audit-log-label-resolver.service.unit.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/resources/audit-log/audit-log-label-resolver.service.ts test/unit/resources/audit-log/audit-log-label-resolver.service.unit.spec.ts
git commit -m "feat(audit-log): add label resolver for foreign-key-shaped diff fields"
```

---

### Task 5: `AuditLog` entity — add `changes` column

**Files:**
- Modify: `src/resources/audit-log/entities/audit-log.entity.ts`

No branching logic, so no dedicated unit test — same reasoning as the original entity task. Verified via type-check.

- [ ] **Step 1: Add the column**

```typescript
    @Column('jsonb', { name: 'changes', nullable: true })
        changes: unknown[] | null;
```
Add this alongside the existing `requestBody` column (same file, same style).

- [ ] **Step 2: Type-check**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npm run build`
Expected: builds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/resources/audit-log/entities/audit-log.entity.ts
git commit -m "feat(audit-log): add changes column to AuditLog entity"
```

---

### Task 6: `AuditLogSubscriber`

**Files:**
- Create: `src/resources/audit-log/audit-log.subscriber.ts`
- Test: `test/unit/resources/audit-log/audit-log.subscriber.unit.spec.ts`

**Interfaces:**
- Consumes: `computeFieldDiff` (Task 2), `pushAuditChange`/`runWithAuditContext` (Task 1), `AuditLogLabelResolverService.resolveLabel` (Task 4).
- Produces: `AuditLogSubscriber implements EntitySubscriberInterface`, self-registering via `dataSource.subscribers.push(this)` — added to `AuditLogModule`'s providers (Task 10). No other module references it directly.

Do **not** use `@automock/jest`'s `TestBed` for this one — its constructor has a real side effect (`dataSource.subscribers.push(this)`) that automock's auto-mocked `DataSource` won't handle correctly. Instantiate directly with hand-built fakes, matching this repo's existing pattern for side-effecting constructors (see `google-calendar.repository.unit.spec.ts`).

- [ ] **Step 1: Write the failing tests**

```typescript
import { DataSource, InsertEvent, RemoveEvent, UpdateEvent } from 'typeorm';
import { AuditLogSubscriber } from '../../../../src/resources/audit-log/audit-log.subscriber';
import { AuditLogLabelResolverService } from '../../../../src/resources/audit-log/audit-log-label-resolver.service';
import { runWithAuditContext, finalizeAuditChanges, pushAuditChange } from '../../../../src/common/audit-context.storage';

describe('AuditLogSubscriber', () => {
    function build (resolveLabel: jest.Mock = jest.fn().mockResolvedValue(null)) {
        const fakeDataSource = { subscribers: [] } as unknown as DataSource;
        const labelResolverService = { resolveLabel } as unknown as AuditLogLabelResolverService;
        const subscriber = new AuditLogSubscriber(fakeDataSource, labelResolverService);
        return { subscriber, fakeDataSource, resolveLabel };
    }

    it('registers itself with the DataSource on construction', () => {
        const { fakeDataSource, subscriber } = build();

        expect(fakeDataSource.subscribers).toContain(subscriber);
    });

    it('afterUpdate pushes an update change for the fields that actually differ, with resolved labels', async () => {
        const { subscriber, resolveLabel } = build(jest.fn().mockResolvedValue('In progress'));

        const result = await runWithAuditContext(async () => {
            await subscriber.afterUpdate({
                metadata: { name: 'Tasks' },
                entity: { id: 42, phaseId: 5 },
                databaseEntity: { id: 42, phaseId: 3 },
            } as unknown as UpdateEvent<any>);
            return finalizeAuditChanges();
        });

        expect(result).toEqual([{
            entityName: 'Tasks', entityId: 42, action: 'update',
            fields: [{ field: 'phaseId', from: 3, fromLabel: 'In progress', to: 5, toLabel: 'In progress' }],
        }]);
    });

    it('afterUpdate pushes nothing when nothing actually changed', async () => {
        const { subscriber } = build();

        const result = await runWithAuditContext(async () => {
            await subscriber.afterUpdate({
                metadata: { name: 'Tasks' },
                entity: { id: 42, phaseId: 3 },
                databaseEntity: { id: 42, phaseId: 3 },
            } as unknown as UpdateEvent<any>);
            return finalizeAuditChanges();
        });

        expect(result).toEqual([]);
    });

    it('afterInsert pushes an insert change for the new row', async () => {
        const { subscriber } = build();

        const result = await runWithAuditContext(async () => {
            await subscriber.afterInsert({
                metadata: { name: 'Tasks' },
                entity: { id: 42, title: 'New task' },
            } as unknown as InsertEvent<any>);
            return finalizeAuditChanges();
        });

        expect(result).toEqual([{
            entityName: 'Tasks', entityId: 42, action: 'insert',
            fields: [{ field: 'id', to: 42, toLabel: null }, { field: 'title', to: 'New task', toLabel: null }],
        }]);
    });

    it('beforeRemove pushes a delete change for the removed row', async () => {
        const { subscriber } = build();

        const result = await runWithAuditContext(async () => {
            await subscriber.beforeRemove({
                metadata: { name: 'Tasks' },
                databaseEntity: { id: 42, title: 'Old task' },
            } as unknown as RemoveEvent<any>);
            return finalizeAuditChanges();
        });

        expect(result).toEqual([{
            entityName: 'Tasks', entityId: 42, action: 'delete',
            fields: [{ field: 'id', from: 42, fromLabel: null }, { field: 'title', from: 'Old task', fromLabel: null }],
        }]);
    });

    it('does nothing and does not throw when called outside an active audit context', async () => {
        const { subscriber } = build();

        await expect(subscriber.afterUpdate({
            metadata: { name: 'Tasks' },
            entity: { id: 42, phaseId: 5 },
            databaseEntity: { id: 42, phaseId: 3 },
        } as unknown as UpdateEvent<any>)).resolves.toBeUndefined();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- audit-log.subscriber.unit.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent, DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { pushAuditChange, AuditEntityChange } from '../../common/audit-context.storage';
import { computeFieldDiff } from './audit-log-diff.util';
import { AuditLogLabelResolverService } from './audit-log-label-resolver.service';

@EventSubscriber()
export class AuditLogSubscriber implements EntitySubscriberInterface {
    private readonly logger = new Logger(AuditLogSubscriber.name);

    constructor (
        dataSource: DataSource,
        private readonly labelResolverService: AuditLogLabelResolverService,
    ) {
        dataSource.subscribers.push(this);
    }

    async afterInsert (event: InsertEvent<any>): Promise<void> {
        await this.capture(event.metadata.name, event.entity, undefined, 'insert');
    }

    async afterUpdate (event: UpdateEvent<any>): Promise<void> {
        await this.capture(event.metadata.name, event.entity, event.databaseEntity, 'update');
    }

    async beforeRemove (event: RemoveEvent<any>): Promise<void> {
        await this.capture(event.metadata.name, undefined, event.databaseEntity, 'delete');
    }

    private async capture (
        entityName: string,
        newValues: Record<string, unknown> | undefined,
        oldValues: Record<string, unknown> | undefined,
        action: AuditEntityChange['action']
    ): Promise<void> {
        try {
            const raw = computeFieldDiff(newValues, oldValues);
            if (raw.length === 0) {
                return;
            }
            const entityId = ((newValues?.id ?? oldValues?.id) as number | string);
            const fields = await Promise.all(raw.map(async (d) => ({
                field: d.field,
                ...('from' in d ? { from: d.from, fromLabel: await this.labelResolverService.resolveLabel(d.field, d.from) } : {}),
                ...('to' in d ? { to: d.to, toLabel: await this.labelResolverService.resolveLabel(d.field, d.to) } : {}),
            })));
            pushAuditChange({ entityName, entityId, action, fields });
        } catch (e) {
            this.logger.error(`Failed to capture audit diff for ${entityName}: ${e.message}`);
        }
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- audit-log.subscriber.unit.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/resources/audit-log/audit-log.subscriber.ts test/unit/resources/audit-log/audit-log.subscriber.unit.spec.ts
git commit -m "feat(audit-log): add global TypeORM subscriber for entity change capture"
```

---

### Task 7: Update `AuditLogMiddleware` to attach changes

**Files:**
- Modify: `src/common/middlewares/audit-log.middleware.ts`
- Test: `test/unit/common/middlewares/audit-log.middleware.unit.spec.ts` (extend)

**Interfaces:**
- Consumes: `runWithAuditContext`, `finalizeAuditChanges` (Task 1), `collapseRelationPairs` (Task 3).
- Produces: the `enqueue()` call now includes a `changes` field, and `resourceType`/`resourceId` prefer the first non-relation entity change over the URL-derived fallback.

**Critical ordering note** (this is *why* the change looks the way it does, not a stylistic choice): `res.on('finish', ...)` must be registered **inside** the `runWithAuditContext(() => { ... })` callback, alongside `next()` — not before it. `AsyncLocalStorage` context propagates to an `EventEmitter` listener based on where the listener was *registered*, not where the event later fires. Registering the listener before opening the context would mean the listener always sees an empty/no-op context when it eventually runs, silently producing `changes: null` on every row.

- [ ] **Step 1: Extend the failing tests** (add to the existing spec file)

```typescript
import { runWithAuditContext, pushAuditChange } from '../../../../src/common/audit-context.storage';

// ... inside the existing describe('AuditLogMiddleware', () => { ... }) block:

    it('attaches accumulated changes from the audit context to the enqueued entry', () => {
        const { middleware, enqueue } = buildMiddleware();
        const req: any = { method: 'PATCH', headers: {}, params: { id: '42' }, route: { path: '/api/v1/tasks/:id' }, originalUrl: '/api/v1/tasks/42', body: {} };
        const res = buildRes(200);
        let capturedNext: () => void;
        const next = jest.fn(() => { capturedNext(); });

        // Simulate a downstream subscriber pushing a change during next().
        capturedNext = () => { pushAuditChange({ entityName: 'Tasks', entityId: 42, action: 'update', fields: [{ field: 'phaseId', from: 3, to: 5 }] }); };

        middleware.use(req, res as any, next);
        (res as unknown as EventEmitter).emit('finish');

        expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({
            resourceType: 'Tasks',
            resourceId: '42',
            changes: [{ entityName: 'Tasks', entityId: 42, action: 'update', fields: [{ field: 'phaseId', from: 3, to: 5 }] }],
        }));
    });

    it('falls back to the URL-derived resourceType and a null changes field when nothing changed', () => {
        const { middleware, enqueue } = buildMiddleware();
        const req: any = { method: 'POST', headers: {}, params: {}, route: { path: '/api/v1/company' }, originalUrl: '/api/v1/company', body: {} };
        const res = buildRes(201);

        middleware.use(req, res as any, jest.fn());
        (res as unknown as EventEmitter).emit('finish');

        expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'company', changes: null }));
    });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- audit-log.middleware.unit.spec.ts`
Expected: 2 new FAILs (the new `pushAuditChange` call has no active context yet, and `changes`/updated `resourceType` logic don't exist).

- [ ] **Step 3: Update the implementation**

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AuditLogBufferService } from '../../resources/audit-log/audit-log-buffer.service';
import { sanitizeRequestBody } from '../../resources/audit-log/audit-log-sanitize.util';
import { collapseRelationPairs } from '../../resources/audit-log/audit-log-diff.util';
import { finalizeAuditChanges, runWithAuditContext, AuditEntityChange } from '../audit-context.storage';

const LOGGED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const RELATION_ENTITY_NAMES = new Set(['TaskUserAssignmentRelation']);

@Injectable()
export class AuditLogMiddleware implements NestMiddleware {
    constructor (private readonly auditLogBufferService: AuditLogBufferService) {}

    use (req: Request, res: Response, next: NextFunction): void {
        if (!LOGGED_METHODS.has(req.method)) {
            next();
            return;
        }

        // Both res.on('finish', ...) and next() must run inside this callback -
        // AsyncLocalStorage binds to where a listener is *registered*, not where
        // it later fires, so registering 'finish' outside this context would
        // always see an empty context by the time the response actually ends.
        runWithAuditContext(() => {
            res.on('finish', () => {
                const user = (req as unknown as { user?: { id?: number } }).user;
                const route: string = (req.route?.path as string | undefined) ?? req.originalUrl;
                const changes = collapseRelationPairs(finalizeAuditChanges());
                const primaryChange = changes.find((c) => !RELATION_ENTITY_NAMES.has(c.entityName)) as AuditEntityChange | undefined;

                this.auditLogBufferService.enqueue({
                    userId: user?.id ?? null,
                    ip: req.ip,
                    userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
                    method: req.method,
                    route,
                    resourceType: primaryChange ? primaryChange.entityName : this.extractResourceType(route),
                    resourceId: primaryChange ? String(primaryChange.entityId) : (req.params?.id ?? null),
                    statusCode: res.statusCode,
                    requestBody: sanitizeRequestBody(req.body),
                    changes: changes.length > 0 ? changes : null,
                });
            });

            next();
        });
    }

    private extractResourceType (route: string): string | null {
        const segments = route.split('/').filter(Boolean);
        const apiIndex = segments.indexOf('api');
        const candidate = apiIndex >= 0 ? segments[apiIndex + 2] : segments[0];
        return candidate ?? null;
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- audit-log.middleware.unit.spec.ts`
Expected: PASS (all 6 tests — 4 original + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/common/middlewares/audit-log.middleware.ts test/unit/common/middlewares/audit-log.middleware.unit.spec.ts
git commit -m "feat(audit-log): attach entity-level changes to HTTP-captured audit rows"
```

---

### Task 8: `AuditLogWsInterceptor`

**Files:**
- Create: `src/common/interceptors/audit-log-ws.interceptor.ts`
- Test: `test/unit/common/interceptors/audit-log-ws.interceptor.unit.spec.ts`

**Interfaces:**
- Consumes: `runWithAuditContext`, `finalizeAuditChanges` (Task 1), `collapseRelationPairs` (Task 3), `AuditLogBufferService.enqueue()` (existing, v1).
- Produces: `AuditLogWsInterceptor implements NestInterceptor` — applied to `TasksGateway` (Task 10).

- [ ] **Step 1: Write the failing tests**

```typescript
import { of, throwError } from 'rxjs';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { AuditLogWsInterceptor } from '../../../../src/common/interceptors/audit-log-ws.interceptor';
import { AuditLogBufferService } from '../../../../src/resources/audit-log/audit-log-buffer.service';
import { pushAuditChange } from '../../../../src/common/audit-context.storage';

describe('AuditLogWsInterceptor', () => {
    function build () {
        const enqueue = jest.fn();
        const bufferService = { enqueue } as unknown as AuditLogBufferService;
        return { interceptor: new AuditLogWsInterceptor(bufferService), enqueue };
    }

    function buildContext (client: unknown, handlerName = 'updateTask'): ExecutionContext {
        return {
            switchToHttp: () => ({ getRequest: () => client }),
            getHandler: () => ({ name: handlerName }),
        } as unknown as ExecutionContext;
    }

    it('enqueues a WS audit entry with the socket user/ip and accumulated changes on success', (done) => {
        const { interceptor, enqueue } = build();
        const client = { user: { id: 7 }, handshake: { address: '9.9.9.9' } };
        const handler: CallHandler = { handle: () => of({ id: 42 }).pipe() };
        // Simulate the subscriber pushing a change while the handler "runs" inside the opened context.
        const wrappedHandler: CallHandler = { handle: () => {
            pushAuditChange({ entityName: 'Tasks', entityId: 42, action: 'update', fields: [{ field: 'phaseId', from: 3, to: 5 }] });
            return handler.handle();
        } };

        interceptor.intercept(buildContext(client), wrappedHandler).subscribe(() => {
            expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({
                userId: 7, ip: '9.9.9.9', method: 'WS', route: 'updateTask', statusCode: 200,
                changes: [{ entityName: 'Tasks', entityId: 42, action: 'update', fields: [{ field: 'phaseId', from: 3, to: 5 }] }],
            }));
            done();
        });
    });

    it('records userId: null for an unauthenticated socket', (done) => {
        const { interceptor, enqueue } = build();
        const client = { handshake: { address: '9.9.9.9' } };
        const handler: CallHandler = { handle: () => of(undefined) };

        interceptor.intercept(buildContext(client), handler).subscribe(() => {
            expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ userId: null }));
            done();
        });
    });

    it('records a failure and re-throws the original error unchanged', (done) => {
        const { interceptor, enqueue } = build();
        const client = { user: { id: 7 }, handshake: { address: '9.9.9.9' } };
        const error = new Error('handler blew up');
        const handler: CallHandler = { handle: () => throwError(() => error) };

        interceptor.intercept(buildContext(client), handler).subscribe({
            error: (e) => {
                expect(e).toBe(error);
                expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
                done();
            },
        });
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- audit-log-ws.interceptor.unit.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuditLogBufferService } from '../../resources/audit-log/audit-log-buffer.service';
import { collapseRelationPairs } from '../../resources/audit-log/audit-log-diff.util';
import { finalizeAuditChanges, runWithAuditContext } from '../audit-context.storage';

interface AuditableSocket {
    user?: { id?: number };
    handshake?: { address?: string };
}

@Injectable()
export class AuditLogWsInterceptor implements NestInterceptor {
    constructor (private readonly auditLogBufferService: AuditLogBufferService) {}

    intercept (context: ExecutionContext, next: CallHandler): Observable<unknown> {
        // Matches this codebase's existing (if incidental) convention: AuthGuard
        // reads the socket via switchToHttp().getRequest() for WS handlers too,
        // since Nest's WS adapter indexes the raw handler args regardless of the
        // execution context's declared type.
        const client = context.switchToHttp().getRequest() as AuditableSocket;
        const eventName = context.getHandler().name;

        return runWithAuditContext(() => next.handle().pipe(
            tap(() => this.record(client, eventName, 200)),
            catchError((err) => {
                this.record(client, eventName, 500);
                throw err;
            }),
        ));
    }

    private record (client: AuditableSocket, eventName: string, statusCode: number): void {
        const changes = collapseRelationPairs(finalizeAuditChanges());
        const primaryChange = changes[0];

        this.auditLogBufferService.enqueue({
            userId: client.user?.id ?? null,
            ip: client.handshake?.address ?? '',
            userAgent: null,
            method: 'WS',
            route: eventName,
            resourceType: primaryChange?.entityName ?? null,
            resourceId: primaryChange ? String(primaryChange.entityId) : null,
            statusCode,
            requestBody: null,
            changes: changes.length > 0 ? changes : null,
        });
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- audit-log-ws.interceptor.unit.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/common/interceptors/audit-log-ws.interceptor.ts test/unit/common/interceptors/audit-log-ws.interceptor.unit.spec.ts
git commit -m "feat(audit-log): add WS interceptor to capture tasks-gateway mutations"
```

---

### Task 9: `AuditLogRepository.findRecent` + `AuditLogService` + `AuditLogController`

**Files:**
- Modify: `src/resources/audit-log/audit-log.repository.ts`
- Create: `src/resources/audit-log/audit-log.service.ts`
- Create: `src/resources/audit-log/audit-log.controller.ts`
- Test: `test/unit/resources/audit-log/audit-log.repository.unit.spec.ts` (extend)
- Test: `test/unit/resources/audit-log/audit-log.service.unit.spec.ts`
- Test: `test/unit/resources/audit-log/audit-log.controller.unit.spec.ts`

**Interfaces:**
- Produces: `AuditLogRepository.findRecent(maxAgeDays: number, limit: number): Promise<AuditLog[]>`; `AuditLogService.findRecent(): Promise<AuditLog[]>` (fixed at 30 days / 1000 rows); `AuditLogController` with `GET /api/v1/audit-log`, `@Roles(Role.Admin)` (the existing global `RolesGuard` picks this up automatically — no `@UseGuards` needed, matching `AuthController.changeUser`'s existing use of `@Roles` alone).

- [ ] **Step 1: Write the failing tests**

```typescript
// --- append to test/unit/resources/audit-log/audit-log.repository.unit.spec.ts ---
describe('findRecent', () => {
    it('queries rows within the given age window, ordered newest first, capped at the given limit', async () => {
        const find = jest.fn().mockResolvedValue([]);
        const repository = new AuditLogRepository({ find } as unknown as Repository<AuditLog>);

        await repository.findRecent(30, 1000);

        expect(find).toHaveBeenCalledWith(expect.objectContaining({
            order: { createdAt: 'DESC' },
            take: 1000,
        }));
    });
});
```

```typescript
// --- test/unit/resources/audit-log/audit-log.service.unit.spec.ts ---
import { TestBed } from '@automock/jest';
import { AuditLogService } from '../../../../src/resources/audit-log/audit-log.service';
import { AuditLogRepository } from '../../../../src/resources/audit-log/audit-log.repository';
import { AuditLog } from '../../../../src/resources/audit-log/entities/audit-log.entity';

describe('AuditLogService', () => {
    it('findRecent delegates to the repository with a 30-day / 1000-row bound', async () => {
        const { unit, unitRef } = TestBed.create(AuditLogService).compile();
        const repository = unitRef.get(AuditLogRepository);
        const rows = [{ id: 1 }] as AuditLog[];
        repository.findRecent.mockResolvedValue(rows);

        const result = await unit.findRecent();

        expect(repository.findRecent).toHaveBeenCalledWith(30, 1000);
        expect(result).toBe(rows);
    });
});
```

```typescript
// --- test/unit/resources/audit-log/audit-log.controller.unit.spec.ts ---
import { TestBed } from '@automock/jest';
import { AuditLogController } from '../../../../src/resources/audit-log/audit-log.controller';
import { AuditLogService } from '../../../../src/resources/audit-log/audit-log.service';
import { AuditLog } from '../../../../src/resources/audit-log/entities/audit-log.entity';

describe('AuditLogController', () => {
    it('findRecent delegates to AuditLogService.findRecent', async () => {
        const { unit, unitRef } = TestBed.create(AuditLogController).compile();
        const service = unitRef.get(AuditLogService);
        const rows = [{ id: 1 }] as AuditLog[];
        service.findRecent.mockResolvedValue(rows);

        expect(await unit.findRecent()).toBe(rows);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- audit-log.repository.unit.spec.ts audit-log.service.unit.spec.ts audit-log.controller.unit.spec.ts`
Expected: FAIL — `findRecent` doesn't exist on the repository, and the service/controller modules don't exist.

- [ ] **Step 3: Write the implementations**

Append to `audit-log.repository.ts`:
```typescript
import { MoreThanOrEqual } from 'typeorm';
// ... inside the class:
    findRecent (maxAgeDays: number, limit: number): Promise<AuditLog[]> {
        const since = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
        return this.auditLogRepository.find({
            where: { createdAt: MoreThanOrEqual(since) },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
```

`audit-log.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLog } from './entities/audit-log.entity';

const MAX_AGE_DAYS = 30;
const MAX_ROWS = 1000;

@Injectable()
export class AuditLogService {
    constructor (private readonly auditLogRepository: AuditLogRepository) {}

    findRecent (): Promise<AuditLog[]> {
        return this.auditLogRepository.findRecent(MAX_AGE_DAYS, MAX_ROWS);
    }
}
```

`audit-log.controller.ts`:
```typescript
import { Controller, Get } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLog } from './entities/audit-log.entity';
import { Roles } from '../../common/guards/roles/roles.decorator';
import { Role } from '../../common/guards/roles/role.enum';

@Controller('audit-log')
export class AuditLogController {
    constructor (private readonly auditLogService: AuditLogService) {}

    @Roles(Role.Admin)
    @Get()
    findRecent (): Promise<AuditLog[]> {
        return this.auditLogService.findRecent();
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- audit-log.repository.unit.spec.ts audit-log.service.unit.spec.ts audit-log.controller.unit.spec.ts`
Expected: PASS (3 tests: 1 repository + 1 service + 1 controller, plus the 2 pre-existing repository tests still passing).

- [ ] **Step 5: Commit**

```bash
git add src/resources/audit-log/audit-log.repository.ts src/resources/audit-log/audit-log.service.ts src/resources/audit-log/audit-log.controller.ts test/unit/resources/audit-log/audit-log.repository.unit.spec.ts test/unit/resources/audit-log/audit-log.service.unit.spec.ts test/unit/resources/audit-log/audit-log.controller.unit.spec.ts
git commit -m "feat(audit-log): add GET /audit-log admin-only endpoint"
```

---

### Task 10: Wire everything together

**Files:**
- Modify: `src/resources/audit-log/audit-log.module.ts`
- Modify: `src/resources/tasks/tasks.module.ts`
- Modify: `src/resources/tasks/gateway/tasks.gateway.ts`

No new branching logic — pure DI/decorator wiring, verified via full build + full unit suite + a manual boot check (Docker, per how the v1 wiring bug was actually caught last time — a local build+unit-test pass is not sufficient to prove middleware/gateway DI wiring is correct, since neither exercises Nest's runtime dependency graph the way an actual boot does).

- [ ] **Step 1: Update `AuditLogModule`**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogBufferService } from './audit-log-buffer.service';
import { AuditLogMiddleware } from '../../common/middlewares/audit-log.middleware';
import { AuditLogWsInterceptor } from '../../common/interceptors/audit-log-ws.interceptor';
import { AuditLogSubscriber } from './audit-log.subscriber';
import { AuditLogLabelResolverService } from './audit-log-label-resolver.service';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { UsersModule } from '../users/users.module';
import { TaskPhaseModule } from '../task-phase/task-phase.module';
import { TaskProjectModule } from '../task-project/task-project.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([AuditLog]),
        UsersModule,
        TaskPhaseModule,
        TaskProjectModule,
    ],
    controllers: [AuditLogController],
    providers: [
        AuditLogRepository,
        AuditLogBufferService,
        AuditLogMiddleware,
        AuditLogLabelResolverService,
        AuditLogSubscriber,
        AuditLogService,
        AuditLogWsInterceptor,
    ],
    exports: [AuditLogMiddleware, AuditLogBufferService, AuditLogWsInterceptor],
})
export class AuditLogModule {}
```

- [ ] **Step 2: Import `AuditLogModule` into `TasksModule`**

In `src/resources/tasks/tasks.module.ts`, add `import { AuditLogModule } from '../audit-log/audit-log.module';` and add `AuditLogModule` to the `imports` array.

- [ ] **Step 3: Apply the interceptor to `TasksGateway`**

In `src/resources/tasks/gateway/tasks.gateway.ts`, add `import { UseInterceptors } from '@nestjs/common';` and `import { AuditLogWsInterceptor } from '../../../common/interceptors/audit-log-ws.interceptor';`, then add `@UseInterceptors(AuditLogWsInterceptor)` above the `@WebSocketGateway(...)` decorator on the `TasksGateway` class.

- [ ] **Step 4: Type-check**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npm run build`
Expected: builds with no TypeScript errors, and no circular-dependency warning at build time (`TaskPhaseModule`/`TaskProjectModule`/`UsersModule` don't import `TasksModule` or `AuditLogModule`, so `AuditLogModule` ← `TasksModule` is a one-way edge — verified during planning, but re-confirm here since this is where it would actually surface).

- [ ] **Step 5: Run the full unit suite**

Run: `npm run test:unit`
Expected: all suites pass, including every audit-log spec from Tasks 1–9.

- [ ] **Step 6: Boot verification via docker-compose**

This step exists because the v1 audit-log module had a middleware DI-wiring bug that a clean `npm run build` + full unit-test pass did **not** catch — it only surfaced when the app was actually booted against a real Postgres. `TasksGateway` now depends on `AuditLogModule` too, so re-verify the same way:

```bash
docker compose up --build -d postgres app
docker compose logs app --tail=50
```
Expected: `Nest application successfully started` with no `UnknownDependenciesException`. Then tear down: `docker compose down`.

- [ ] **Step 7: Commit**

```bash
git add src/resources/audit-log/audit-log.module.ts src/resources/tasks/tasks.module.ts src/resources/tasks/gateway/tasks.gateway.ts
git commit -m "feat(audit-log): wire subscriber, WS interceptor, and read API into the app"
```

---

## Self-review notes

- **Spec coverage**: generic diffing (Task 2/6, no per-entity code), REST + WS capture (Tasks 7/8), label resolution at write time (Task 4), relation-pair collapsing (Task 3), bounded `changes` size (Task 1's cap), admin-only read API (Task 9), all covered. Frontend viewer is explicitly a separate plan per the agreed split.
- **Type consistency**: `AuditEntityChange`/`AuditFieldChange` (Task 1) flow unchanged through `AuditLogSubscriber` (Task 6) → `collapseRelationPairs` (Task 3) → both capture entry points (Tasks 7, 8) → the `changes` column (Task 5). `computeFieldDiff`'s `RawFieldDiff` (Task 2) is only ever consumed inside the subscriber, never leaks past it.
- **Verified against real codebase behavior, not assumed**: subscriber registration pattern, WS auth reality (including confirming the frontend already sends the JWT at socket handshake), and `switchToHttp().getRequest()` for WS context were all checked against actual code before this plan was written, not inferred from TypeORM/NestJS documentation alone.
