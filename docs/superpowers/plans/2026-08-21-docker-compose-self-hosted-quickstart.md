# Docker Compose Self-Hosted Quickstart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `docker compose up` on a fresh clone bring up a working app (Postgres + self-hosted LiveKit + the Nest/Angular app) on `localhost`, with migrations applied automatically and no external SaaS account required to boot.

**Architecture:** A new `docker-compose.yml` orchestrates three services (`postgres`, `livekit`, `app`) built from the existing `Dockerfile`. Two pre-existing bugs that would otherwise block this are fixed: `FirebaseModule` no longer crashes the whole app on missing/invalid Firebase credentials, and the production image gains what `npm run migration:run` needs (currently neither `migrations/` nor `typeOrm.config.ts` are copied into it, and dev deps it depends on — `ts-node`, `typescript` — are stripped). Separately, the frontend's LiveKit connection address is currently a hardcoded literal pointing at one specific LiveKit Cloud project regardless of environment — it's made a build-time config value so the Compose `livekit` service is actually reachable.

**Tech Stack:** Docker / Docker Compose, NestJS + TypeORM (backend), Angular 20 (frontend), PostgreSQL 16, LiveKit (`livekit-server` OSS image), Jest (`ts-jest`, `.unit.spec.ts` suffix).

**Spec:** `docs/superpowers/specs/2026-08-21-docker-compose-self-hosted-quickstart-design.md`

## Global Constraints

- Compose targets a local/eval quickstart, not a production TLS deploy — no Traefik/TLS in `docker-compose.yml`; `start.sh.example` stays the documented production path, unchanged.
- No external SaaS account (Firebase, Google, Slack) may be required for `docker compose up` to boot successfully.
- `.env`/`.env.example` are not modified — Postgres runs with `POSTGRES_HOST_AUTH_METHOD: trust` (no credentials required at all, confirmed with the user after discovering the repo's own `.env` has blank `DB_USER`/`DB_PASSWORD`); Compose overrides `DB_HOST`/`DB_USER`/`DB_PASSWORD` on the `app` service via its own `environment:` block so it connects correctly regardless of `.env`'s values.
- Migrations must run automatically on every container start and be safe to re-run (TypeORM's own migrations table already makes `migration:run` idempotent — do not add extra guards around it).
- `livekitUrl` is a build-time Angular config value (`environment.ts`/`environment.prod.ts`), not a Compose-runtime env var — do not add env-templating for it.
- Follow this repo's commit convention: Conventional Commits, no ticket prefix, no `Co-Authored-By: Claude` trailer (see `AGENTS.md`).

---

## Task 1: Stop Firebase credentials from blocking app boot

**Files:**
- Modify: `src/common/services/firebase/firebase.module.ts`
- Test: `test/unit/common/services/firebase.module.unit.spec.ts` (new)

**Interfaces:**
- Produces: `createFirebaseService(configService: ConfigService): Promise<FirebaseService>` — exported from `src/common/services/firebase/firebase.module.ts`. Resolves with a `FirebaseService` instance regardless of whether `FirebaseService.init()` succeeds or throws.

- [ ] **Step 1: Write the failing test**

Create `test/unit/common/services/firebase.module.unit.spec.ts`:

```typescript
import { createFirebaseService } from '../../../../src/common/services/firebase/firebase.module';
import { FirebaseService } from '../../../../src/common/services/firebase/firebase.service';
import { ConfigService } from '@nestjs/config';

describe('createFirebaseService', () => {
    it('resolves with a FirebaseService instance even when init() fails (e.g. missing credentials file)', async () => {
        const configService = {
            get: jest.fn().mockReturnValue('credentials/does-not-exist.json'),
        } as unknown as ConfigService;

        const result = await createFirebaseService(configService);

        expect(result).toBeInstanceOf(FirebaseService);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- firebase.module.unit.spec.ts`
Expected: FAIL — `createFirebaseService` does not exist yet on `firebase.module.ts` (TypeScript compile error via `ts-jest`, e.g. "has no exported member 'createFirebaseService'").

- [ ] **Step 3: Write minimal implementation**

Replace the full contents of `src/common/services/firebase/firebase.module.ts`:

```typescript
import { Logger, Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { ConfigService } from '@nestjs/config';

export async function createFirebaseService (configService: ConfigService): Promise<FirebaseService> {
    const firebaseService = new FirebaseService(configService);
    try {
        await firebaseService.init();
    } catch (err) {
        Logger.warn(
            `Firebase not configured — uploads will fail until FIREBASE_SERVICE_ACCOUNT/FIREBASE_STORAGE_BUCKET are set correctly: ${err.message}`,
            'FirebaseModule'
        );
    }
    return firebaseService;
}

@Module({
    providers: [
        {
            provide: FirebaseService,
            useFactory: createFirebaseService,
            inject: [ConfigService],
        }
    ],
    exports: [
        FirebaseService
    ],
})
export class FirebaseModule {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- firebase.module.unit.spec.ts`
Expected: PASS

- [ ] **Step 5: Run the full unit suite to check for regressions**

Run: `npm run test:unit`
Expected: PASS (no other suite references `FirebaseModule`'s old shape)

- [ ] **Step 6: Commit**

```bash
git add src/common/services/firebase/firebase.module.ts test/unit/common/services/firebase.module.unit.spec.ts
git commit -m "fix(firebase): don't crash app boot on missing Firebase credentials"
```

---

## Task 2: Make the production image able to run migrations, and auto-run them on start

**Files:**
- Create: `docker-entrypoint.sh`
- Modify: `Dockerfile` (stage 3 only)

**Interfaces:**
- Produces: `docker-entrypoint.sh` at repo root, executable, run as the image's `CMD`. Depended on by Task 3's `app` service (no code interface — just needs to exist and be correct before Compose is smoke-tested).

- [ ] **Step 1: Create the entrypoint script**

Create `docker-entrypoint.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
npm run migration:run
exec node dist/main.js
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x docker-entrypoint.sh
```

- [ ] **Step 3: Update the Dockerfile's final stage**

In `Dockerfile`, replace stage 3 (everything from `# Stage 3: Production image` to the end) with:

```dockerfile
# Stage 3: Production image
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY --from=api-build /app/dist ./dist
COPY --from=web-build /app/dist ./packages/web/dist
COPY proto/ proto/
COPY migrations/ migrations/
COPY typeOrm.config.ts ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ARG APP_PORT=4004
EXPOSE ${APP_PORT}
CMD ["./docker-entrypoint.sh"]
```

(Only change from the original: dropped `--omit=dev` from `npm ci`; added the three `COPY` lines for `migrations/`, `typeOrm.config.ts`, `docker-entrypoint.sh`; added the `chmod` line; changed `CMD` from `["node", "dist/main.js"]` to `["./docker-entrypoint.sh"]`.)

- [ ] **Step 4: Build the image to verify it compiles and migrations can run**

Run: `docker build -t tslen-workhub-quickstart-test .`
Expected: build succeeds (this rebuilds all three stages — may take several minutes on first run).

**Found during implementation:** the first attempt failed with `no space
left on device` while transferring a 7.19GB build context. Cause:
`.dockerignore` didn't exclude `packages/web/.angular` — Angular's local
build cache, 7.1GB on disk, was being shipped into every build context.
Fix: add `packages/web/.angular` to `.dockerignore`. After that, the
build completed normally (~885MB final image). This is a one-line
addition to `.dockerignore` alongside the existing `dist`/`node_modules`
exclusions — no other files affected.

Then, with a Postgres reachable at whatever `.env`'s `DB_HOST`/`DB_PORT` point to (use an already-running local Postgres, or skip this specific check and rely on Task 3's full Compose smoke test instead — both are fine, this step is optional if Task 3 is done immediately after):

Run: `docker run --rm --env-file .env --network host tslen-workhub-quickstart-test npm run migration:run`
Expected: TypeORM reports migrations applied (or "No migrations are pending" if already applied) — not a `ts-node: command not found` or `Cannot find module './migrations/...'` error, which is what today's image would produce.

(Skipped in practice — verified via Task 3's full Compose smoke test instead, as the plan allows.)

- [ ] **Step 5: Commit**

```bash
git add Dockerfile docker-entrypoint.sh .dockerignore
git commit -m "fix(docker): copy migrations into production image and auto-run them on start"
```

---

## Task 3: `docker-compose.yml` — Postgres + LiveKit + app, one command

**Files:**
- Create: `docker-compose.yml`

**Interfaces:**
- Consumes: `Dockerfile` (Task 2's fixed final stage), `.env` (existing, unmodified), `firebase.module.ts` (Task 1's boot stopgap).
- Produces: three Compose services — `postgres` (internal to the Compose network only, not published to the host — the app reaches it at `postgres:5432`), `livekit` (published at `localhost:7880`), `app` (published at `localhost:${APP_PORT}`, default `4004`).

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      # No credentials required: trust auth accepts any connection from
      # inside the Compose network. POSTGRES_USER is left unset so the
      # image defaults it to its own built-in "postgres" role.
      POSTGRES_HOST_AUTH_METHOD: trust
      POSTGRES_DB: ${DB_SCHEMA}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d ${DB_SCHEMA}"]
      interval: 5s
      timeout: 5s
      retries: 10

  livekit:
    image: livekit/livekit-server:latest
    command: --dev --bind 0.0.0.0
    environment:
      LIVEKIT_KEYS: "${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}"
    ports:
      - "7880:7880"

  app:
    build: .
    depends_on:
      postgres:
        condition: service_healthy
      livekit:
        condition: service_started
    env_file:
      - .env
    environment:
      DB_HOST: postgres
      DB_USER: postgres
      DB_PASSWORD: ""
    ports:
      - "${APP_PORT:-4004}:${APP_PORT:-4004}"
    volumes:
      - ./upload:/app/upload
      - ./credentials:/app/credentials

volumes:
  pgdata:
```

(Note: this differs from the version originally written into the plan —
while executing this task, `docker compose config` revealed the repo's
own `.env` has `DB_USER`/`DB_PASSWORD` both blank, which would make the
`postgres:16` image refuse to start. Asked the user; they confirmed the
quickstart should launch with no DB credentials at all rather than
requiring `.env` edits, hence `POSTGRES_HOST_AUTH_METHOD: trust` and the
`app` service pinning `DB_USER`/`DB_PASSWORD` to match the trust-auth
default role instead of inheriting `.env`'s blank values.)

- [ ] **Step 2: Validate the Compose file parses and interpolates correctly**

Run: `docker compose config`
Expected: prints the fully resolved config with no errors; under `app`, `DB_HOST: postgres`, `DB_USER: postgres`, `DB_PASSWORD: ""`; under `postgres`, `POSTGRES_HOST_AUTH_METHOD: trust` and `POSTGRES_DB: tslen` (or whatever `.env`'s `DB_SCHEMA` is — not empty; if empty, `.env` is missing `DB_SCHEMA`).

- [ ] **Step 3: Full smoke test**

Run: `docker compose up -d --build`

Then check each service:

```bash
docker compose ps
# postgres should show "healthy", livekit and app "running"

docker compose logs app --tail=50
# expect TypeORM migration output (applied or "No migrations are pending"),
# then Nest's normal startup log ending in the app listening on APP_PORT —
# NOT a Firebase/DI crash, NOT a "ts-node: not found" error

curl -sf http://localhost:4004/api/v1 || curl -sf http://localhost:4004/api
# expect a response (even a 404 JSON body is fine — it proves the server is up)

curl -sf http://localhost:7880/ 
# expect LiveKit's own response (any HTTP response, not connection refused)
```

Expected: all of the above succeed with the `.env` at repo root as-is (Firebase/Google/Slack values can stay as placeholders).

- [ ] **Step 4: Tear down**

```bash
docker compose down
```

(Leave `-v` off so the `pgdata` volume — and applied migrations — persist for the next run, matching real usage.)

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(docker): add docker-compose stack for self-hosted quickstart"
```

---

## Task 4: Make the frontend's LiveKit URL configurable instead of hardcoded

**Files:**
- Modify: `packages/web/src/environments/environment.ts`
- Modify: `packages/web/src/environments/environment.prod.ts`
- Modify: `packages/web/src/app/pages/call/wellcome/call.component.ts`

**Interfaces:**
- Produces: `environment.livekitUrl: string` (both environment files). Consumed by `call.component.ts` in place of the previous hardcoded literal.

- [ ] **Step 1: Add `livekitUrl` to the dev environment**

In `packages/web/src/environments/environment.ts`, add the new field (empty string — lets `call.component.ts`'s existing `configureUrls()` fallback compute `ws://localhost:7880/` when accessed via `localhost`, matching the Compose `livekit` service):

```typescript

export const environment = {
  isDemo: false,
  production: false,
  protocol: 'http://',
  urlSufix: '/api/v1',
  serverPort: '4004',
  apiHost: '',
  ipCheckerUrl: '',
  ftpDomain: '',
  livekitUrl: '',
};
```

- [ ] **Step 2: Add `livekitUrl` to the prod environment**

In `packages/web/src/environments/environment.prod.ts`, add the field, preserving today's actual production behavior (this project's existing LiveKit Cloud project) as the default:

```typescript
export const environment = {
  isDemo: false,
  production: true,
  protocol: 'https://',
  urlSufix: '/api/v1',
  serverPort: '4004',
  apiHost: '',
  ipCheckerUrl: '',
  ftpDomain: '',
  livekitUrl: 'wss://<redacted-livekit-cloud-project>.livekit.cloud',
};
```

**Addendum (found after Step 5 was committed):** the user flagged that
`environment.prod.ts` is a tracked file — committing the real LiveKit
Cloud URL into it (as this step originally did) put a value they
consider private into git, the same problem `.env`/`start.sh`/
`credentials/*.json` already solve by being gitignored with a checked-in
`.example` template. Fixed as a follow-up commit:

```bash
# packages/web/.gitignore: add this line
/src/environments/environment.prod.ts
```

```bash
git rm --cached packages/web/src/environments/environment.prod.ts
```

(untracks it — the file stays on disk with its real value, local builds
are unaffected)

Create `packages/web/src/environments/environment.prod.ts.example`
(checked in, placeholder value):

```typescript
export const environment = {
  isDemo: false,
  production: true,
  protocol: 'https://',
  urlSufix: '/api/v1',
  serverPort: '4004',
  apiHost: '',
  ipCheckerUrl: '',
  ftpDomain: '',
  livekitUrl: '',
};
```

```bash
git add packages/web/.gitignore packages/web/src/environments/environment.prod.ts.example
git commit -m "fix(web): stop committing environment.prod.ts, ship gitignored-config example instead"
```

A fresh clone now needs one extra setup step before building — see
Task 5's README update.

- [ ] **Step 3: Read `LIVEKIT_URL` from `environment` instead of a hardcoded literal**

In `packages/web/src/app/pages/call/wellcome/call.component.ts`:

Add the import (near the other relative imports already in the file, e.g. after the `TranslateModule` import):

```typescript
import { environment } from '../../../../environments/environment';
```

Replace:

```typescript
let LIVEKIT_URL = 'wss://<redacted-livekit-cloud-project>.livekit.cloud';
```

with:

```typescript
let LIVEKIT_URL = environment.livekitUrl;
```

(`APPLICATION_SERVER_URL` on the line above stays untouched — out of scope, see the spec's "Out of Scope" section.)

- [ ] **Step 4: Verify the frontend still builds**

Run: `cd packages/web && npx ng build --configuration production`
Expected: build succeeds with no TypeScript errors (this is the exact command `Dockerfile` stage 1 runs, so a clean run here is the real signal Task 3's `docker compose up --build` will also succeed on the frontend side).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/environments/environment.ts packages/web/src/environments/environment.prod.ts packages/web/src/app/pages/call/wellcome/call.component.ts
git commit -m "fix(web): make LiveKit connection URL configurable instead of hardcoded"
```

---

## Task 5: README — Compose-first quickstart

**Files:**
- Modify: `README.md`

**Interfaces:**
- None (documentation only). Depends on Tasks 1–4 being complete so every command/claim in the new text is accurate.

- [ ] **Step 1: Replace the "Getting started" section**

In `README.md`, replace the entire `## Getting started` section (currently lines 33–56) with:

```markdown
## Getting started

1. Copy `.env.example` to `.env`. DB and JWT values need real settings;
   Google, Slack, and Firebase credentials can stay as placeholders for a
   first run — those integrations are optional and only needed for
   Calendar sync, Slack alerts, and file uploads respectively.
2. Copy `packages/web/src/environments/environment.prod.ts.example` to
   `environment.prod.ts` in the same folder (gitignored, same idea as
   `.env.example` → `.env`). Leave `livekitUrl` empty to use the Compose
   quickstart's self-hosted LiveKit server, or set it to your own LiveKit
   server/Cloud project URL.
3. Install dependencies:
   ```bash
   npm install
   cd packages/web && npm install
   ```
4. Run the backend:
   ```bash
   npm run start:dev
   ```
5. Run the frontend:
   ```bash
   cd packages/web && npm start
   ```
6. Or run the whole stack with Docker Compose — Postgres, a self-hosted
   LiveKit server, and the app, with migrations applied automatically:
   ```bash
   docker compose up
   ```
   No external accounts are required to boot.
7. For a production deployment behind Traefik with automatic HTTPS, copy
   `start.sh.example` to `start.sh` (gitignored, same idea as
   `.env.example` → `.env`), set `DOMAIN` and customize as needed, then
   `chmod +x start.sh && ./start.sh`.

Migrations run automatically on every `docker compose`/`start.sh`
container start. For bare-metal dev (steps 4–5), run them manually once:
`npm run migration:run`.
```

- [ ] **Step 2: Proofread against the actual commands**

Confirm every command in the new section matches what Tasks 1–4 actually produced: `docker compose up` (Task 3's filename is exactly `docker-compose.yml` at repo root, so this needs no `-f` flag), the `environment.prod.ts.example` path and `livekitUrl` field name (Task 4), `start.sh.example` (unchanged, already existed).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document docker compose self-hosted quickstart"
```
