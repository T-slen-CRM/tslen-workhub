# Node.js and Angular Version Bump Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bump Node.js to the latest LTS (24.19.0) and Angular to the latest
stable major (22.1.x), across every file that pins either version, with a
full test-and-build verification gate after each step.

**Architecture:** Four sequential tasks, each independently verifiable and
committed on its own: (1) Node.js bump first, so every later step already
runs on the target runtime and there's never a window where `@angular/cli`'s
own Node engine requirement is violated; (2) Angular 20→21; (3) Angular
21→22 (Angular's `ng update` does not support skipping a major version, so
this must happen in two passes); (4) manual end-to-end verification.

**Tech Stack:** npm workspaces-less monorepo (root = NestJS backend,
`packages/web` = Angular 20 frontend), nvm for local Node version
management, `ng update` for Angular migrations.

## Global Constraints

- Node target: **24.19.0** (latest LTS, "Krypton") — not the 26.x line,
  which is still "Current" (not yet promoted to LTS as of this plan).
- Angular target: **21.2.21** as the intermediate stop, then
  **22.1.3** (`@angular/core`) / **22.1.5** (`@angular/cli`) as the
  final version — confirmed as the actual latest published versions at
  plan-writing time (`@angular/cli@22.1.5` requires Node
  `^22.22.3 || ^24.15.0 || >=26.0.0` — the current Node pin, 22.22.2, is
  one patch *below* that range, which is exactly why Node must be bumped
  before the second Angular step, not after).
- TypeScript target: **6.0.3** — Angular 22 requires `>=6.0 <6.1`
  specifically (not TypeScript's own latest, 7.x, which is too new).
  6.0.3 also satisfies Angular 21's `>=5.9 <6.1` range, so it only needs
  to change once (during Task 2), not twice.
- `ag-grid-angular`/`ag-grid-community` (currently `28.2.1`) are
  **explicitly out of scope** — already satisfy every Angular version in
  this plan's peer-dep requirements (`>=20.0.0`), and the latest ag-grid
  (`36.x`) is an 8-major jump with its own breaking theming API changes.
  Do not touch these packages as part of this plan.
- There is an unrelated, uncommitted change already in the working tree
  (moment.js removal — `package.json`, `task-create-edit.component.ts`,
  `webpack.config.js`) that the user is handling separately. Do not
  touch, revert, or fold it into any commit made by this plan — `git add`
  only the specific files each task's commit step lists, never `git add
  -A`/`-u`, so that unrelated change stays untouched and uncommitted
  throughout.
- Every `nvm use <version>` in this plan must be run via
  `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use
  <version>` in the same shell invocation as the command that follows it
  (each new Bash tool call starts a fresh shell with no memory of a
  prior `nvm use`).
- Frontend tests: from `packages/web/`, use a temporary (never
  committed) headless Karma config per this repo's `AGENTS.md` testing
  section — write it fresh each task, delete it before committing.

---

## Task 1: Bump Node.js to 24.19.0 (LTS)

**Files:**
- Modify: `.nvmrc` (root)
- Modify: `packages/web/.nvmrc`
- Modify: `package.json` (root) — `engines.node`
- Modify: `Dockerfile` — all three `FROM node:...` stages
- Modify: `.github/workflows/main-ci.yml` — `node-version` matrix

**Interfaces:** None (infrastructure-only task, no code API changes).

- [ ] **Step 1: Install Node 24.19.0 locally if not already present**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm install 24.19.0
```

- [ ] **Step 2: Update the root `.nvmrc`**

Change its contents from `22.22.2` to:
```
24.19.0
```

- [ ] **Step 3: Update `packages/web/.nvmrc`**

This file is currently `20.20.2` — already stale relative to the rest of
the repo even before this plan. Change its contents to:
```
24.19.0
```

- [ ] **Step 4: Update root `package.json`'s engines field**

In `package.json`, find:
```json
  "engines": {
    "npm": ">=10.0.0",
    "node": ">=22.0.0"
  },
```
Change to:
```json
  "engines": {
    "npm": ">=10.0.0",
    "node": ">=24.0.0"
  },
```

- [ ] **Step 5: Update the Dockerfile's three `FROM node:...` lines**

In `Dockerfile`, change:
```dockerfile
FROM node:20 AS web-build
```
to:
```dockerfile
FROM node:24 AS web-build
```
(this stage was already stale at `node:20`, independent of this plan —
correcting it here brings it in line with the other two stages).

Change:
```dockerfile
FROM node:22 AS api-build
```
to:
```dockerfile
FROM node:24 AS api-build
```

Change:
```dockerfile
FROM node:22-slim
```
to:
```dockerfile
FROM node:24-slim
```

- [ ] **Step 6: Update the CI workflow's Node version matrix**

In `.github/workflows/main-ci.yml`, change:
```yaml
    strategy:
      matrix:
        node-version: [22.2.0]
```
to:
```yaml
    strategy:
      matrix:
        node-version: [24.19.0]
```

- [ ] **Step 7: Reinstall dependencies under Node 24.19.0 and verify the backend**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 24.19.0
cd /Users/olegteslenko/Desktop/T/tslen-workhub
npm install
npm run test:unit
npm run test:e2e
npm run build
```
Expected: `npm install` completes without engine-mismatch errors (the
lockfile itself doesn't change — only the Node runtime does, so no
package versions are affected by this task), and both test suites plus
the Nest build pass exactly as they did on Node 22.22.2, since nothing
about the application code changed in this task.

- [ ] **Step 8: Verify the frontend under Node 24.19.0**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 24.19.0
cd /Users/olegteslenko/Desktop/T/tslen-workhub/packages/web
npm install
```

Write a temporary `karma.headless.conf.js` (per `AGENTS.md`'s testing
section):
```javascript
process.env.CHROME_BIN = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

module.exports = function (config) {
  const base = require('./karma.conf.js');
  base(config);
  config.set({
    browsers: ['ChromeHeadlessNoSandbox'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox'],
      },
    },
    singleRun: true,
    autoWatch: false,
    restartOnFileChange: false,
  });
};
```

```bash
npx ng test --karma-config=karma.headless.conf.js --include='**/task-create-edit.component.spec.ts' --include='**/autocomplete.component.spec.ts' --include='**/task-comments.component.spec.ts' --include='**/table-live-kit.component.spec.ts'
npx ng build --configuration production
```
Expected: tests pass, build succeeds. Delete `karma.headless.conf.js`
afterward (never commit it).

- [ ] **Step 9: Commit**

```bash
cd /Users/olegteslenko/Desktop/T/tslen-workhub
git add .nvmrc packages/web/.nvmrc package.json Dockerfile .github/workflows/main-ci.yml
git commit -m "chore: bump Node.js to 24.19.0 LTS"
```

---

## Task 2: Angular 20 → 21 migration

**Files:**
- Modify: `packages/web/package.json` and `packages/web/package-lock.json` (via `ng update` + manual bumps — do not hand-edit version numbers, let the tooling write them)
- Modify: whatever `ng update`'s migration schematics touch (report exact files changed after running it — cannot be listed in advance)

**Interfaces:** None (dependency/tooling bump — no application code API
changes are being *designed* here; `ng update`'s own migration
schematics may apply small automated code changes, e.g. renamed APIs,
which is expected and should be reviewed in the diff, not reverted).

- [ ] **Step 1: Ensure a clean starting point**

```bash
cd /Users/olegteslenko/Desktop/T/tslen-workhub
git status --porcelain
```
Expected: only the pre-existing, unrelated moment.js changes show as
modified (per this plan's Global Constraints) — nothing from Task 1
should be uncommitted at this point. If anything else is dirty, stop
and investigate before proceeding.

- [ ] **Step 2: Run Angular's official update to v21**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 24.19.0
cd /Users/olegteslenko/Desktop/T/tslen-workhub/packages/web
npx ng update @angular/core@21 @angular/cli@21 @angular/cdk@21 @angular/material@21
```
Expected: the command completes, applying version bumps and any
automated migration schematics. If it reports peer-dependency conflicts
it can't resolve automatically (possible given this repo's Dockerfile
already needs `--legacy-peer-deps` for plain installs), re-run with
`--force`:
```bash
npx ng update @angular/core@21 @angular/cli@21 @angular/cdk@21 @angular/material@21 --force
```

- [ ] **Step 3: Bump TypeScript to 6.0.3**

Angular 21 accepts TypeScript `>=5.9 <6.1`, and 22 (Task 3) will require
`>=6.0 <6.1` — 6.0.3 satisfies both, so this is the only TypeScript bump
needed in this whole plan.

```bash
npm install --save-dev typescript@6.0.3
```

- [ ] **Step 4: Bump `@angular-eslint/*` to their v21-compatible versions**

These are currently pinned to `18.4.3`, already stale relative to
Angular 20 before this plan even started. `@angular-eslint/schematics`
etc. track `@angular/cli`'s major version, and `21.4.0` is the latest
stable release compatible with `@angular/cli` 21.x:
```bash
npm install --save-dev @angular-eslint/builder@21.4.0 @angular-eslint/eslint-plugin@21.4.0 @angular-eslint/eslint-plugin-template@21.4.0 @angular-eslint/schematics@21.4.0 @angular-eslint/template-parser@21.4.0
```

- [ ] **Step 5: Move `@kolkov/angular-editor` off its beta pin**

Currently pinned to `3.0.0-beta.2`; `3.1.0` is stable and explicitly
supports Angular 20/21/22:
```bash
npm install @kolkov/angular-editor@3.1.0
```

- [ ] **Step 6: Run the full frontend verification**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 24.19.0
cd /Users/olegteslenko/Desktop/T/tslen-workhub/packages/web
```

Write the same temporary `karma.headless.conf.js` as Task 1 Step 8 (it
was deleted at the end of that task, so recreate it), then:
```bash
npx ng test --karma-config=karma.headless.conf.js --include='**/task-create-edit.component.spec.ts' --include='**/autocomplete.component.spec.ts' --include='**/task-comments.component.spec.ts' --include='**/table-live-kit.component.spec.ts'
npx ng build --configuration production
```

- [ ] **Step 7: If anything fails, use systematic-debugging — do not guess**

`ng update`'s automated migrations occasionally miss an edge case, or a
third-party package (the rich-text editor, ag-grid, angular-calendar)
may surface a runtime warning or compile error under the new Angular
version that wasn't visible from the peer-dependency check alone. If
Step 6 fails: **REQUIRED SUB-SKILL:** use superpowers:systematic-debugging
— read the actual error/stack trace, trace it to its root cause, and
fix that specific thing. Do not silently downgrade a package or add a
blanket `--legacy-peer-deps`/`--force` workaround without understanding
why the failure happened.

- [ ] **Step 8: Run the backend suite too, as a monorepo regression check**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 24.19.0
cd /Users/olegteslenko/Desktop/T/tslen-workhub
npm run test:unit
npm run test:e2e
```
Expected: unaffected by a frontend-only dependency bump, but confirms
nothing in the monorepo's shared tooling broke.

- [ ] **Step 9: Commit**

```bash
cd /Users/olegteslenko/Desktop/T/tslen-workhub
git add packages/web/package.json packages/web/package-lock.json
git add -u packages/web/src
git commit -m "chore(web): update Angular to v21"
```
(`git add -u packages/web/src` stages only *already-tracked* files
under `src/` that `ng update`'s schematics may have modified — it will
not pick up the pre-existing uncommitted moment.js changes as new
additions, since those files are already tracked and `-u` only adds
modifications to tracked files, matching what's expected here. Review
`git status` before committing if anything looks unexpected.)

---

## Task 3: Angular 21 → 22 migration

**Files:**
- Modify: `packages/web/package.json` and `packages/web/package-lock.json` (via `ng update`)
- Modify: whatever `ng update`'s migration schematics touch

**Interfaces:** None (same as Task 2).

- [ ] **Step 1: Run Angular's official update to v22**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 24.19.0
cd /Users/olegteslenko/Desktop/T/tslen-workhub/packages/web
npx ng update @angular/core@22 @angular/cli@22 @angular/cdk@22 @angular/material@22
```
Same `--force` fallback as Task 2 Step 2 if peer-dependency conflicts
block it.

- [ ] **Step 2: Confirm TypeScript still satisfies the new range**

Angular 22 requires TypeScript `>=6.0 <6.1`. 6.0.3 (set in Task 2) is
already in range — verify `ng update` didn't change it unexpectedly:
```bash
grep '"typescript"' package.json
```
Expected: still `6.0.3` (or another `6.0.x` patch if `ng update` bumped
it within-range on its own, which is fine).

- [ ] **Step 3: Bump `@angular-eslint/*` to their v22-compatible versions**

`22.1.0` is the latest stable release compatible with `@angular/cli`
22.x:
```bash
npm install --save-dev @angular-eslint/builder@22.1.0 @angular-eslint/eslint-plugin@22.1.0 @angular-eslint/eslint-plugin-template@22.1.0 @angular-eslint/schematics@22.1.0 @angular-eslint/template-parser@22.1.0
```

- [ ] **Step 4: Run the full frontend verification**

Same as Task 2 Step 6 (recreate the temporary Karma config, run the
same targeted specs, run the production build).

- [ ] **Step 5: If anything fails, use systematic-debugging**

Same as Task 2 Step 7 — root-cause any failure before attempting a fix.

- [ ] **Step 6: Run the backend suite as a regression check**

Same as Task 2 Step 8.

- [ ] **Step 7: Run the root lint (matches what CI actually runs)**

```bash
cd /Users/olegteslenko/Desktop/T/tslen-workhub
npm run lint
```
Expected: passes. (A prior session fixed root lint crashing on
`packages/web`'s missing plugins — this step confirms that fix still
holds after two Angular major bumps and the `@angular-eslint/*` updates
in this plan.)

- [ ] **Step 8: Commit**

```bash
cd /Users/olegteslenko/Desktop/T/tslen-workhub
git add packages/web/package.json packages/web/package-lock.json
git add -u packages/web/src
git commit -m "chore(web): update Angular to v22"
```

---

## Task 4: Manual end-to-end verification

**Files:** None — verification only.

**Interfaces:** None.

- [ ] **Step 1: Full local CI-equivalent run**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 24.19.0
cd /Users/olegteslenko/Desktop/T/tslen-workhub
npm install
npm run lint
npm run test:e2e
npm run test:unit
```
Expected: all pass, matching exactly what `.github/workflows/main-ci.yml`
runs — this is the closest local proxy for "will CI go green."

- [ ] **Step 2: Start the app and smoke-test in a browser**

```bash
npm run start:dev
```
(in a second terminal)
```bash
cd packages/web && npm start
```

Open the app, log in, and check:
- The task board loads and a task card opens (the detail dialog redesigned
  earlier this session — the area most likely to surface any Angular
  Material behavioral change from the version bump).
- Creating/editing a task, adding a comment, and the Assignee
  autocomplete's chip/label behavior all still work as before.
- No new console errors/warnings on load that weren't there before this
  plan (Angular major versions occasionally add new deprecation
  warnings — note any that appear, they don't need to block this plan
  unless they're errors, but are worth a follow-up ticket).

- [ ] **Step 3: Report findings**

If anything from Steps 1–2 doesn't match expectations, report it back
rather than silently reworking earlier tasks — some Angular 21/22
migration specifics can only really be confirmed by seeing them live.
