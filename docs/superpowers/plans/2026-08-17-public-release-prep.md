# Public Release Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the security/hygiene issues found in the pre-public-release audit and remove confirmed-dead code/dependencies, ending with a squashed-history snapshot ready to become the initial commit of a new public repo. Nothing gets pushed publicly as part of this plan — the last task stops short of that for explicit human go-ahead.

**Architecture:** A sequence of independent, individually-verified changes to the existing NestJS backend (`src/`) and Angular frontend (`packages/web/`), ordered security-first, then hygiene, then dead-code/dependency removal, then the final history-squash snapshot. Each task is git-committed on its own so the sequence stays bisectable.

**Tech Stack:** NestJS + TypeORM + PostgreSQL (backend), Angular 17 (frontend), Jest (backend tests), Karma/Jasmine (frontend tests).

**Spec:** No separate spec doc — this plan follows directly from the audit findings already presented to and confirmed by the user in conversation (two fork-based audits: secrets/security and dead-code/unused-files, followed by two rounds of clarifying decisions: credentials already rotated; going public via a fresh/squashed-history repo rather than an in-place `git filter-repo` rewrite).

## Global Constraints

- Node >= 22 required for backend commands: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0` before any `npm`/`npx` backend command.
- Conventional Commits, no `Co-Authored-By` trailer, no Jira prefix (AGENTS.md).
- The 4 leaked credentials (2 GCP/Firebase service account keys, 2 OAuth client secrets) are confirmed already rotated by the user — this plan does not need to pause for that, but Task 12 (final secret re-scan) still must run before the history-squash step regardless.
- Every new/changed function that can reasonably be unit tested gets a real test exercising actual behavior (mock only injected dependencies, never the function under test — see `test/unit/resources/google-calendar/google-calendar.repository.unit.spec.ts` for the target style). Purely mechanical deletions (dead files, unused deps) are verified by the full test suite + a full build instead, not new tests.
- Never `git push`, never touch the `origin` remote, and never create/register a new public repo anywhere in this plan — the final task produces a local, reviewable snapshot only and explicitly stops there.

---

### Task 1: Fix path-traversal in avatar upload

**Files:**
- Create: `src/resources/users/utils/generate-avatar-filename.ts`
- Test: `test/unit/resources/users/generate-avatar-filename.unit.spec.ts`
- Modify: `src/resources/users/users.controller.ts`

**Interfaces:**
- Produces: `generateAvatarFilename(userId: string, originalName: string): string`, used by the `diskStorage` filename callback in `users.controller.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/resources/users/generate-avatar-filename.unit.spec.ts
import { generateAvatarFilename } from '../../../../src/resources/users/utils/generate-avatar-filename';

describe('generateAvatarFilename', () => {
    it('never includes path separators or traversal sequences, even from a malicious original name', () => {
        const result = generateAvatarFilename('42', '../../../../etc/evil.sh');

        expect(result).not.toContain('/');
        expect(result).not.toContain('\\');
        expect(result).not.toContain('..');
    });

    it('preserves the file extension of a normal upload', () => {
        const result = generateAvatarFilename('42', 'photo.png');

        expect(result.endsWith('.png')).toBe(true);
    });

    it('includes the userId for traceability', () => {
        const result = generateAvatarFilename('42', 'photo.png');

        expect(result.startsWith('42_')).toBe(true);
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest-unit.json test/unit/resources/users/generate-avatar-filename.unit.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/resources/users/utils/generate-avatar-filename.ts
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export function generateAvatarFilename (userId: string, originalName: string): string {
    const extension = path.extname(originalName);
    return `${userId}_${Date.now()}_${uuidv4()}${extension}`;
}
```

(`path.extname` only ever returns the suffix after the last `.` — it never returns path separators, so it's safe to use directly even on an attacker-controlled `originalName`. This mirrors the existing safe pattern already used in `posts.controller.ts` and `tasks.controller.ts`.)

- [ ] **Step 4: Run the test to verify it passes**

Run the same command as Step 2.
Expected: PASS, 3 tests.

- [ ] **Step 5: Wire it into the controller**

In `src/resources/users/users.controller.ts`, add the import:

```ts
import { generateAvatarFilename } from './utils/generate-avatar-filename';
```

and change:

```ts
            filename: (req: Request, file: Express.Multer.File, cb) => {
                const userId = req.params.userId;
                const fileName = `${userId}_${Date.now()}_${file.originalname}`;
                cb(null, fileName);
            }
```

to:

```ts
            filename: (req: Request, file: Express.Multer.File, cb) => {
                cb(null, generateAvatarFilename(req.params.userId, file.originalname));
            }
```

- [ ] **Step 6: Run the backend unit suite to confirm no regressions**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest-unit.json test/unit/resources/users`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/resources/users/utils/generate-avatar-filename.ts src/resources/users/users.controller.ts test/unit/resources/users/generate-avatar-filename.unit.spec.ts
git commit -m "fix(users): stop path traversal in avatar upload filename"
```

---

### Task 2: Fix CORS credential-reflection on public paths

**Files:**
- Test: `test/unit/common/middlewares/cors.middlewares.unit.spec.ts`
- Modify: `src/common/middlewares/cors.middlewares.ts`

**Interfaces:**
- Consumes: none new — `CorsMiddleware.use(req, res, next)` is a plain class with no constructor dependencies.

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/common/middlewares/cors.middlewares.unit.spec.ts
import { CorsMiddleware } from '../../../../src/common/middlewares/cors.middlewares';

describe('CorsMiddleware', () => {
    const originalEnv = process.env;
    let middleware: CorsMiddleware;

    beforeEach(() => {
        process.env = {
            ...originalEnv,
            FRONT_DOMAIN: 'https://crm.example.com',
            PUBLIC_PATH: 'auth/google-callback,company',
        };
        middleware = new CorsMiddleware();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    function fakeReqRes (path: string, origin: string) {
        const headers: Record<string, string> = {};
        const req = { path, headers: { origin, host: 'ignored' }, method: 'GET' } as any;
        const res = {
            setHeader: (key: string, value: string) => { headers[key] = value; },
            status: () => res,
            send: () => undefined,
            sendStatus: () => undefined,
            headers,
        } as any;
        return { req, res };
    }

    it('sets Allow-Credentials for a whitelisted origin', () => {
        const { req, res } = fakeReqRes('/api/v1/tasks', 'https://crm.example.com');
        const next = jest.fn();

        middleware.use(req, res, next);

        expect(res.headers['Access-Control-Allow-Credentials']).toBe('true');
        expect(next).toHaveBeenCalled();
    });

    it('rejects a non-whitelisted origin on a non-public path', () => {
        const { req, res } = fakeReqRes('/api/v1/tasks', 'https://evil.example.com');
        res.status = jest.fn().mockReturnValue(res);
        res.send = jest.fn();
        const next = jest.fn();

        middleware.use(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('does not set Allow-Credentials for an arbitrary origin on a public path', () => {
        const { req, res } = fakeReqRes('/api/v1/auth/google-callback', 'https://evil.example.com');
        const next = jest.fn();

        middleware.use(req, res, next);

        expect(res.headers['Access-Control-Allow-Credentials']).toBeUndefined();
        expect(next).toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest-unit.json test/unit/common/middlewares/cors.middlewares.unit.spec.ts`
Expected: FAIL on the third test — `Access-Control-Allow-Credentials` is currently `'true'` for the public-path case too.

- [ ] **Step 3: Fix the middleware**

In `src/common/middlewares/cors.middlewares.ts`, change:

```ts
        if (whitelistOrigin.includes(hostOrigin) || isSpecialPath) {
            if (hostOrigin){
                res.setHeader('Access-Control-Allow-Origin', hostOrigin);
            }
            res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,UPDATE,OPTIONS, PATCH');
            res.setHeader('Access-Control-Allow-Headers', 'Authorization, Origin, X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Observe');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        } else {
```

to:

```ts
        if (whitelistOrigin.includes(hostOrigin) || isSpecialPath) {
            if (hostOrigin){
                res.setHeader('Access-Control-Allow-Origin', hostOrigin);
            }
            res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,UPDATE,OPTIONS, PATCH');
            res.setHeader('Access-Control-Allow-Headers', 'Authorization, Origin, X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Observe');
            // Only reflect credentials for actually-whitelisted origins. Public
            // paths (PUBLIC_PATH) intentionally bypass the origin whitelist for
            // unauthenticated flows (OAuth callback, signup) — they must never
            // also advertise credentialed cross-origin access.
            if (whitelistOrigin.includes(hostOrigin)) {
                res.setHeader('Access-Control-Allow-Credentials', 'true');
            }
        } else {
```

- [ ] **Step 4: Run the test to verify it passes**

Run the same command as Step 2.
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/common/middlewares/cors.middlewares.ts test/unit/common/middlewares/cors.middlewares.unit.spec.ts
git commit -m "fix(cors): stop reflecting credentials on public-path CORS bypass"
```

---

### Task 3: Harden raw-SQL companyId interpolation

**Files:**
- Create: `src/common/utils/sql-safe-integer.ts`
- Test: `test/unit/common/utils/sql-safe-integer.unit.spec.ts`
- Modify: `src/resources/users/users.repository.ts`
- Modify: `src/resources/events-by-user/events-by-user.repository.ts`

**Interfaces:**
- Produces: `toSqlSafeInteger(value: number, fieldName: string): number` — throws `BadRequestException` if `value` is not a real integer, otherwise returns it unchanged. Used at every raw-SQL `companyId` interpolation site in both modified files.

This is a defense-in-depth hardening, not a fix for a currently-exploitable bug: `companyId` always comes from the authenticated user's DB row (`user.companyId`), never directly from client input, in every call site touched here. The audit rated this LOW for that reason. Full parameterization of the UNION raw-queries these methods build was considered and rejected as disproportionate risk/complexity for a non-exploitable issue — this guard closes the gap cheaply instead.

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/common/utils/sql-safe-integer.unit.spec.ts
import { BadRequestException } from '@nestjs/common';
import { toSqlSafeInteger } from '../../../../src/common/utils/sql-safe-integer';

describe('toSqlSafeInteger', () => {
    it('returns a valid integer unchanged', () => {
        expect(toSqlSafeInteger(42, 'companyId')).toBe(42);
    });

    it('throws for a non-integer number', () => {
        expect(() => toSqlSafeInteger(1.5, 'companyId')).toThrow(BadRequestException);
    });

    it('throws for a non-numeric value smuggled past the type system', () => {
        expect(() => toSqlSafeInteger('1; DROP TABLE users;--' as unknown as number, 'companyId'))
            .toThrow(BadRequestException);
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest-unit.json test/unit/common/utils/sql-safe-integer.unit.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/common/utils/sql-safe-integer.ts
import { BadRequestException } from '@nestjs/common';

export function toSqlSafeInteger (value: number, fieldName: string): number {
    if (!Number.isInteger(value)) {
        throw new BadRequestException(`Invalid ${fieldName}`);
    }
    return value;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run the same command as Step 2.
Expected: PASS, 3 tests.

- [ ] **Step 5: Apply it at each call site**

In `src/resources/users/users.repository.ts`, add the import:

```ts
import { toSqlSafeInteger } from '../../common/utils/sql-safe-integer';
```

then in `getBirthdayAnniversary`, change:

```ts
        const companyId: number = user.companyId;
```

to:

```ts
        const companyId: number = toSqlSafeInteger(user.companyId, 'companyId');
```

and in `getUsersWithRelationsByDateRange`, change:

```ts
        const companyId = user.companyId;
```

to:

```ts
        const companyId = toSqlSafeInteger(user.companyId, 'companyId');
```

In `src/resources/events-by-user/events-by-user.repository.ts`, add the same import, then apply the same change (`const companyId: number = user.companyId;` → `const companyId: number = toSqlSafeInteger(user.companyId, 'companyId');`) at all 4 occurrences (in `getEventsByMonth`, `getAbsentToday`, and the two other methods flagged in the audit — search the file for `const companyId` to find each one; there are 4 total).

- [ ] **Step 6: Run the full backend suite to confirm no regressions**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest.json --testPathIgnorePatterns=e2e 2>&1 | tail -30`
Expected: same pass count as the pre-existing baseline (181 passed, 1 unrelated pre-existing failure in `google-calendar.service.spec.ts`), plus the 3 new `sql-safe-integer` tests.

- [ ] **Step 7: Commit**

```bash
git add src/common/utils/sql-safe-integer.ts src/resources/users/users.repository.ts src/resources/events-by-user/events-by-user.repository.ts test/unit/common/utils/sql-safe-integer.unit.spec.ts
git commit -m "fix(repositories): validate companyId before raw-SQL interpolation"
```

---

### Task 4: Add rate limiting to unauthenticated write endpoints

**Files:**
- Modify: `package.json` (add `@nestjs/throttler`)
- Create: `src/common/throttler/throttler.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Produces: a global `ThrottlerGuard` (from `@nestjs/throttler`) registered as an additional `APP_GUARD`, alongside the existing `AuthGuard`/`RolesGuard` already registered that way in `auth.module.ts` — NestJS supports multiple `APP_GUARD` providers, each is applied in sequence, this repo already does exactly that.

`POST /company` (`@SkipAuth()`) and `POST /users/signup` (`@SkipAuth()`) currently have no rate limiting, and will be publicly discoverable once the source is public. A single global limit is the proportionate fix — no per-route tuning needed since every other route already requires a valid JWT (rate-limiting an authenticated route mainly protects against runaway retry loops, which is a reasonable default everywhere, not just the two public ones).

- [ ] **Step 1: Install the dependency**

Run: `npm install @nestjs/throttler@^5`

- [ ] **Step 2: Write the module**

```ts
// src/common/throttler/throttler.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
    imports: [
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]), // 20 requests per IP per 60s, global default
    ],
    providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
    ],
})
export class AppThrottlerModule {}
```

- [ ] **Step 3: Wire it into `AppModule`**

In `src/app.module.ts`, add the import:

```ts
import { AppThrottlerModule } from './common/throttler/throttler.module';
```

and add `AppThrottlerModule` to the `imports: []` array (anywhere in the list — order doesn't matter for module imports).

- [ ] **Step 4: Run the full backend suite to confirm no regressions**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest.json --testPathIgnorePatterns=e2e 2>&1 | tail -30`
Expected: same pass count as Task 3's baseline (the `ThrottlerGuard` only activates on real HTTP requests through a bootstrapped app; unit tests that construct controllers/services directly via `TestBed`/`new` never go through the guard layer, so this shouldn't break any existing unit test).

There is no automated test for the throttling behavior itself in this plan (real rate-limit testing needs a bootstrapped app + fake timers or real elapsed time, disproportionate for this pass) — `@nestjs/throttler` is an official, independently-tested NestJS package. If you want to manually confirm it's live after deploying: hit `POST /api/v1/company` more than 20 times in 60 seconds from the same IP and confirm a 429 response.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/common/throttler/ src/app.module.ts
git commit -m "feat(security): add global rate limiting ahead of public release"
```

---

### Task 5: Run npm audit fix on both packages

**Files:** `package.json`, `package-lock.json`, `packages/web/package.json`, `packages/web/package-lock.json` (all modified by the audit fix commands, no manual edits).

- [ ] **Step 1: Fix the backend**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0
npm audit fix
```

- [ ] **Step 2: Verify the backend still passes**

Run: `npx jest --config ./test/jest.json --testPathIgnorePatterns=e2e 2>&1 | tail -30`
Expected: same pass count as before (181 passed, 1 pre-existing unrelated failure). If `npm audit fix` changed a dependency in a way that breaks a test, do not use `--force` to push further fixes — stop and report which package broke what, so it can be evaluated individually rather than blindly forced.

- [ ] **Step 3: Fix the frontend**

```bash
cd packages/web
npm audit fix
```

- [ ] **Step 4: Verify the frontend still builds**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0
npx ng build 2>&1 | tail -40
```
Expected: build succeeds (exit code 0).

- [ ] **Step 5: Commit**

```bash
cd /Users/olegteslenko/Desktop/T/T-SLEN
git add package.json package-lock.json packages/web/package.json packages/web/package-lock.json
git commit -m "chore: apply non-breaking npm audit fixes"
```

(Remaining vulnerabilities after the non-breaking pass are expected — `npm audit fix --force` pulls in breaking major-version bumps and is out of scope for this plan; note the remaining count in the commit body if non-zero, for future follow-up.)

---

### Task 6: Delete `start.sh` (hardcoded internal infra, per user decision)

**Files:**
- Delete: `start.sh`
- Modify: `README.md`

**Interfaces:** none.

The user opted to delete this script outright rather than genericize it — it hardcoded real production infra (an internal production hostname and Docker network name) and isn't needed for a public, self-hosted-by-others project; `Dockerfile` alone plus the README's existing generic `docker build`/`docker run` steps are enough.

- [ ] **Step 1: Delete the file**

```bash
git rm start.sh
```

- [ ] **Step 2: Remove the dangling reference in `README.md`**

Read `README.md`'s "Getting started" section first (it may have drifted). Remove the line referencing `start.sh`:

```
5. Or build and run the full stack with Docker (see `Dockerfile` and `start.sh`):
```

Change it to just reference `Dockerfile`:

```
5. Or build and run with Docker (see `Dockerfile`):
```

(Leave the `docker build`/`docker run` example commands beneath it as-is — they're already generic.)

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "chore: remove start.sh (hardcoded internal deployment infra)"
```

---

### Task 7: Genericize hardcoded internal URL in the nav menu

**Files:**
- Modify: `packages/web/src/environments/environment.ts`
- Modify: `packages/web/src/app/theme/layout/admin/navigation/navigation.ts`

**Interfaces:**
- Produces: `environment.ipCheckerUrl: string`, consumed by the nav menu item's `url` field.

- [ ] **Step 1: Read both files first**

Read `packages/web/src/environments/environment.ts` and the surrounding context of the `ip-checker` nav item in `navigation.ts` (this plan already located it — a nav item with `id: 'ip-checker'`, `url: 'https://ip.t-slen.com'` — but confirm line numbers haven't drifted before editing).

- [ ] **Step 2: Add the config key**

In `environment.ts`, add `ipCheckerUrl: ''` to the exported object (empty string default — a self-hosted deployer without this internal tool simply won't get the menu item, per Step 4).

- [ ] **Step 3: Reference it from the nav item**

In `navigation.ts`, add the import if not already present:

```ts
import { environment } from '../../../../../environments/environment';
```

(adjust the relative path to match this file's actual depth under `src/app/` — verify it by checking how other files in this same directory import `environment`, or count directory levels back to `src/environments/`.)

Change the nav item's `url: 'https://ip.t-slen.com'` to `url: environment.ipCheckerUrl`.

- [ ] **Step 4: Hide the item when unconfigured**

Wrap the nav item so it only appears when `environment.ipCheckerUrl` is set — find how this navigation array is filtered/rendered (check `nav-content.component.ts`/`nav-item.component.ts` for whether items are filtered by a truthy `url`, or whether an empty `url` already renders harmlessly as a dead link). If there's no existing filtering mechanism, the minimal safe change is to leave the item always present but pointing at an empty string — do not add new filtering logic to the nav rendering pipeline for this (that's larger scope than this task warrants); just note in the commit message that the item is hidden only when `environment.prod.json` (deployment-time config) sets `ipCheckerUrl`.

- [ ] **Step 5: Verify the frontend still builds**

```bash
cd packages/web
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0
npx ng build 2>&1 | tail -40
```
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
cd /Users/olegteslenko/Desktop/T/T-SLEN
git add packages/web/src/environments/environment.ts packages/web/src/app/theme/layout/admin/navigation/navigation.ts
git commit -m "chore: make ip-checker nav URL configurable instead of hardcoded"
```

---

### Task 8: Delete confirmed-dead frontend trees

**Files (delete):**
- `packages/web/src/app/pages/maintenance/` (whole directory)
- `packages/web/src/app/pages/core-chart/` (whole directory)
- `packages/web/src/app/dashboard/` (whole directory)
- `packages/web/src/app/fack-db/chart-data.ts`
- `packages/web/src/app/configs/chart-configs/` (whole directory)

**Files (modify):**
- `packages/web/src/app/app-routing.module.ts` (remove the already-commented-out `maintenance` route block)
- `packages/web/src/app/services/error.interceptor.ts` (remove the dead commented-out `/maintenance/error` reference, line ~34)
- `packages/web/src/app/components/components.module.ts` (remove `StatusGroupsComponent` declaration/export)
- Delete: `packages/web/src/app/components/status-groups/` (whole directory)

Each item here was independently confirmed this session (not just trusted from the audit report) via direct grep showing zero external references — see the conversation for the exact commands. Before deleting each item, re-run its confirming grep once more in case anything changed since the audit:

- [ ] **Step 1: Re-confirm and delete `maintenance/`**

```bash
grep -n "maintenance" packages/web/src/app/app-routing.module.ts
```
Expected: only the already-commented-out route (2 lines starting with `//`). If anything else references it, stop and investigate before deleting.

```bash
rm -rf packages/web/src/app/pages/maintenance
```

Then remove the commented-out route block from `app-routing.module.ts` (the two `//` lines found above).

- [ ] **Step 2: Re-confirm and delete `core-chart/`**

```bash
grep -rln "core-chart\|CoreChart\|CrtApex\|crt-apex" packages/web/src --include="*.ts" --include="*.html" | grep -v "/core-chart/"
```
Expected: no output.

```bash
rm -rf packages/web/src/app/pages/core-chart
```

- [ ] **Step 3: Re-confirm and delete `dashboard/`**

```bash
grep -rln "DashboardModule\|dashboard-routing" packages/web/src --include="*.ts" | grep -v "/dashboard/"
```
Expected: no output.

```bash
rm -rf packages/web/src/app/dashboard
```

- [ ] **Step 4: Delete `fack-db/chart-data.ts` and `chart-configs/`**

```bash
grep -rln "chart-data\|chartData" packages/web/src --include="*.ts" | grep -v "fack-db/chart-data.ts" | grep -v "/core-chart/\|/dashboard/"
```
Expected: no output (the only consumers were in the two directories already deleted above).

```bash
rm -f packages/web/src/app/fack-db/chart-data.ts
rmdir packages/web/src/app/fack-db 2>/dev/null || true  # only removes if now empty
grep -rln "chart-configs" packages/web/src --include="*.ts"
```
Expected: no output for the second grep.

```bash
rm -rf packages/web/src/app/configs/chart-configs
```

- [ ] **Step 5: Delete the dead `StatusGroupsComponent`**

```bash
grep -rn "app-status-groups" packages/web/src --include="*.html"
```
Expected: no output.

Remove `StatusGroupsComponent` from `components.module.ts`'s import/declarations/exports (read the file first, remove exactly the lines referencing it — the module itself stays, since it declares other real components too), then:

```bash
rm -rf packages/web/src/app/components/status-groups
```

- [ ] **Step 6: Remove the dead commented reference in `error.interceptor.ts`**

Read the file, remove the commented-out line(s) referencing `/maintenance/error` (harmless either way since it was already commented out, but it references a route that no longer exists after Step 1 — delete for consistency, don't leave dangling references to deleted code even in comments).

- [ ] **Step 7: Verify the frontend still builds**

```bash
cd packages/web
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0
npx ng build 2>&1 | tail -60
```
Expected: build succeeds with no new errors. If it fails referencing any deleted path, that means the earlier confirming grep missed a reference — stop, investigate the specific broken import, and either restore that one file or fix the reference, rather than proceeding.

- [ ] **Step 8: Commit**

```bash
cd /Users/olegteslenko/Desktop/T/T-SLEN
git add -A packages/web/src/app/pages/maintenance packages/web/src/app/pages/core-chart packages/web/src/app/dashboard packages/web/src/app/fack-db packages/web/src/app/configs/chart-configs packages/web/src/app/components/status-groups packages/web/src/app/app-routing.module.ts packages/web/src/app/services/error.interceptor.ts packages/web/src/app/components/components.module.ts
git commit -m "chore: remove unrouted dead frontend trees (maintenance, core-chart, dashboard, status-groups)"
```

---

### Task 9: Remove unused root npm dependencies and dead environment.ts keys

**Files:**
- Modify: `package.json`
- Modify: `packages/web/src/environments/environment.ts`

- [ ] **Step 1: Re-confirm and remove unused root deps**

```bash
grep -rn "from ['\"]or['\"]" src/ test/
grep -rn "mysql2" src/ test/
```
Expected: no output for either (the project is Postgres-only per `database.module.ts`/`typeOrm.config.ts`).

Remove the `"or": "^0.2.0",` and `"mysql2": "^3.9.6",` lines from `package.json`'s `dependencies`.

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0
npm install
```

- [ ] **Step 2: Remove dead `environment.ts` keys**

```bash
grep -rn "defaultImage\|facebookAuthId\|ftpDomain\|defaultProjectLogo" packages/web/src --include="*.ts" --include="*.html" | grep -v "environments/environment"
```
Expected: no output (all four are unused outside their own declaration).

In `packages/web/src/environments/environment.ts`, remove those four keys, leaving:

```ts
export const environment = {
  isDemo: false,
  production: false,
  protocol: 'http://',
  urlSufix: '/api/v1',
  serverPort: '4004',
  apiHost: '',
};
```

(If Task 7 already added `ipCheckerUrl` to this file, keep that key — only remove the four confirmed-dead ones.)

- [ ] **Step 3: Verify both halves still build/test**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0
npx jest --config ./test/jest.json --testPathIgnorePatterns=e2e 2>&1 | tail -30
cd packages/web && npx ng build 2>&1 | tail -40
```
Expected: backend same pass count as baseline; frontend build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /Users/olegteslenko/Desktop/T/T-SLEN
git add package.json package-lock.json packages/web/src/environments/environment.ts
git commit -m "chore: remove unused deps (or, mysql2) and dead environment.ts keys"
```

---

### Task 10: Prune dead ad-tech methods from `data.service.ts`

**Files:**
- Modify: `packages/web/src/app/services/data.service.ts`

This file has ~60 methods hitting endpoints with no corresponding backend controller at all (confirmed this session: the full list of `@Controller()` routes in `src/` is `auth`, `company`/`company-days-off-rules`, `events-by-user`, `google-calendar`, `inventory`, `job-position`, `live-kit`, `posts`, `task-comments`, `task-phase`, `task-project`, `tasks`, `users`/groups — nothing matching `/ssp/`, `/campaigns/`, `/creatives/`, `/autorules/`, `/lists/`, `/audience/`, `/conversions/`, `/transactions/`, `/statistic/`, `/media/`, `/paypal`). These are dead on arrival, left over from an unrelated ad-tech product this codebase was adapted from. The file also holds the generic `getObservableData`/`postData`/`getData`/`updateData`/`deleteData`/`getManagerData`/`getTestData`/`getAgGridData` helpers that real, live features depend on — **do not delete the file, prune method-by-method.**

- [ ] **Step 1: Enumerate candidate dead methods**

```bash
grep -nE "^\s{4}[a-zA-Z_]+\s*\(" packages/web/src/app/services/data.service.ts
```

This lists every method in the file with its line number. Cross-reference against the live backend route list above (re-derive it fresh with `grep -rn "@Controller(" src/resources` if unsure) — any method whose endpoint path doesn't match a live controller's route prefix is a deletion candidate.

- [ ] **Step 2: For each candidate, confirm zero callers before deleting**

For each candidate method name (e.g. `createCampaign`, `getAllSsp`, `deleteAudience`, ...), run:

```bash
grep -rn "\.createCampaign(" packages/web/src --include="*.ts" --include="*.html" | grep -v "data.service.ts"
```

(substitute the real method name each time). Only delete a method if this returns zero results. If a method IS called somewhere, leave it — even if its backend route looks dead, a live caller means this needs a separate decision (either the frontend feature calling it is also dead and should be investigated separately, or the backend route exists under a name/path this quick scan missed), not a blind deletion as part of this mechanical pass.

- [ ] **Step 3: Delete each confirmed-orphaned method**

Remove the method body for each one confirmed in Step 2. Work through the full candidate list from Step 1 this way.

- [ ] **Step 4: Verify the frontend still builds**

```bash
cd packages/web
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0
npx ng build 2>&1 | tail -60
```
Expected: build succeeds. If it fails referencing a method you deleted, that means Step 2's grep missed a caller (e.g. a dynamic `this[methodName]()` call, unlikely here but possible) — restore that specific method rather than investigating further; it's not worth the risk for a cleanup pass.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/services/data.service.ts
git commit -m "chore: remove dead ad-tech-product methods from data.service.ts"
```

---

### Task 11: Verify and remove lower-confidence unused frontend dependencies

**Files:**
- Modify: `packages/web/package.json`

**Candidates** (flagged by the audit as likely-dead but not yet confirmed against build config): `browserify-fs`, `path-browserify`, `stream-browserify`, `babel-runtime`, `moment-locales-webpack-plugin`, `rxjs-compat`, `@types/crypto-js`, `popper.js`, `webpack`.

- [ ] **Step 1: Check build config for each, not just source imports**

```bash
cd packages/web
grep -n "browserify-fs\|path-browserify\|stream-browserify\|babel-runtime\|moment-locales-webpack-plugin\|rxjs-compat\|crypto-js\|popper.js\|webpack" angular.json src/polyfills.ts 2>/dev/null
```

Also check for a custom webpack config file if one exists (`find . -maxdepth 1 -iname "*.webpack.js" -o -iname "webpack.config.js"`) and grep it too, since these are exactly the kind of package a custom webpack/polyfill config would reference without a normal TS `import`.

- [ ] **Step 2: Remove only what's confirmed unreferenced anywhere**

For each candidate with zero hits in Step 1 (and already zero hits from the audit's `grep -r "from '<pkg>'"` pass), remove its line from `packages/web/package.json`. For any candidate that DOES show up in `angular.json`/a webpack config/`polyfills.ts`, leave it and note why in the commit message.

```bash
npm install
```

- [ ] **Step 3: Verify the frontend still builds**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0
npx ng build 2>&1 | tail -60
```
Expected: build succeeds. A missing-module error here means that package was load-bearing in a way the checks missed — `git checkout packages/web/package.json packages/web/package-lock.json && npm install` to restore it, then move on without that one (don't spend further effort root-causing an obscure build-tool dependency for a cleanup pass).

- [ ] **Step 4: Commit**

```bash
cd /Users/olegteslenko/Desktop/T/T-SLEN
git add packages/web/package.json packages/web/package-lock.json
git commit -m "chore: remove confirmed-unused frontend build dependencies"
```

---

### Task 12: Rename the broken migration directory name

**Files:**
- Rename: `migrations/$npm_config_name/` → `migrations/initial-posts-image-column/`

The literal `$npm_config_name` directory name is a shell-variable substitution that never got filled in when this migration was originally generated (`npm run migration:generate` was invoked without `--npm_config_name=<value>`). TypeORM tracks applied migrations by the class `name` field inside the file, not by file path, so renaming the containing directory is safe and doesn't affect already-applied migrations in any existing database.

- [ ] **Step 1: Rename the directory**

```bash
git mv "migrations/\$npm_config_name" migrations/initial-posts-image-column
```

- [ ] **Step 2: Confirm the migration's `name` field is untouched**

```bash
cat migrations/initial-posts-image-column/1745678559976-migrations.ts
```
Expected: identical content to before, `name = 'Migrations1745678559976'` unchanged.

- [ ] **Step 3: Verify the migration datasource glob still finds it**

`typeOrm.config.ts`'s `migrations: [__dirname + '/migrations/**/*{.ts,.js}']` glob is path-based and recursive — a renamed subdirectory is still matched, no config change needed. No live DB is available in this environment to run `migration:run` against, so this can't be executed end-to-end here; the rename itself is the fix, and TypeORM's `typeorm_metadata`/migrations table matches by the class `name`, not the file path, so this is safe.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: rename migrations/\$npm_config_name to a real directory name"
```

---

### Task 13: Final secret re-scan before the history-squash snapshot

**Files:** none (verification only).

- [ ] **Step 1: Confirm `credentials/` contains no real files**

```bash
git status --short
ls -la credentials/
```
Expected: only `.gitkeep` (or empty) — no `.json` files present or staged.

- [ ] **Step 2: Re-scan the current tree for anything secret-shaped**

```bash
grep -rniE "(BEGIN (RSA|PRIVATE) KEY|client_secret\"?\s*[:=]\s*[\"']GOCSPX|AKIA[0-9A-Z]{16}|-----BEGIN)" --include="*.ts" --include="*.json" --include="*.js" src/ packages/web/src/ test/ .env.example 2>/dev/null
```
Expected: no output. If anything matches, stop — do not proceed to Task 14 until it's resolved (removed and, if it's a real credential, rotated).

- [ ] **Step 3: Confirm `.gitignore` still covers the sensitive paths**

```bash
git check-ignore -v .env credentials/foo.json 2>/dev/null
```
Expected: both print a matching `.gitignore` rule.

- [ ] **Step 4: No commit** — this task only verifies; nothing to change if it passes.

---

### Task 14: Create the squashed-history public-release snapshot

**Files:** none (git operations only). **This task does not push anywhere or touch the `origin` remote.**

- [ ] **Step 1: Confirm Task 13 passed clean**

Do not proceed unless Task 13's Step 2 grep returned no output.

- [ ] **Step 2: Create an orphan branch with the current tree as a single commit**

```bash
git checkout --orphan public-release
git add -A
git commit -m "chore: initial public release snapshot"
```

(`--orphan` creates a new branch with no parent history — the working tree carries over as-is, so this single commit contains exactly the current, already-cleaned state of every file, with zero prior history including the removed credential files.)

- [ ] **Step 3: Verify the snapshot's tree matches `main`'s tree exactly (content-only diff, no history)**

```bash
git diff main public-release --stat
```
Expected: no output (identical file contents — this branch is a history squash, not a content change).

- [ ] **Step 4: Switch back to `main`**

```bash
git checkout main
```

(Leaves `public-release` as a local branch, ready for review. Do not push it, do not create a new remote/repo for it, do not run `git filter-repo`/BFG on `main` — those are all explicitly out of scope for this plan per the Global Constraints.)

- [ ] **Step 5: Report to the user**

State clearly: the `public-release` branch is ready locally with a single squashed commit and no secret history. Point out that going public from here means: (a) pushing this branch to a *new*, empty repository (not this one's `origin`) as its initial commit, and (b) deciding what to do with the current private `main` (with full history) — keep it as an internal/private mirror, or discard it, entirely the user's call and not something to act on without their explicit instruction.
