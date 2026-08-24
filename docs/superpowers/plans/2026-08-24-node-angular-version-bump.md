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
- TypeScript target: **stays at 5.9.3 through Task 2, bumps to 6.0.3 in
  Task 3.** Originally planned as a single bump to 6.0.3 during Task 2,
  reasoning that `@angular/compiler-cli@21`'s own peer dep
  (`>=5.9 <6.1`) allows it — **corrected after `npm ls` surfaced real
  "invalid" peer-dep warnings mid-Task-2**: `@angular-devkit/build-angular
  @21.2.21` (the actual builder Jest's toolchain depends on) requires the
  *narrower* `>=5.9 <6.0`, and `@typescript-eslint/eslint-plugin@8.57.2`
  caps at `<6.0.0` too — TypeScript 6.0.3 breaks both during the 21 step.
  17 of 22 Jest suites failed to even compile under it (widespread
  `strictPropertyInitialization`/`noImplicitAny` errors on pre-existing
  code that TypeScript 6.0 apparently enforces differently than 5.9).
  6.0.3 is still the right target once Angular 22's own
  `@angular-devkit/build-angular` range moves — verify that range before
  bumping in Task 3, don't assume it from Task 2's now-corrected
  reasoning.
- `ag-grid-angular`/`ag-grid-community` were originally planned as
  **out of scope** (their peer-dep declaration, `>=20.0.0`, claimed
  compatibility with every Angular version in this plan without a
  version cap). **Corrected mid-Task-3**: peer-dep ranges only describe
  a package's own claimed support window, not actual runtime API usage —
  `ag-grid-angular@28.2.1` (and, unexpectedly, `ngx-toastr@18.0.0`) both
  import `ComponentFactoryResolver` from `@angular/core`, which Angular
  22 removed entirely, so the production build hard-failed regardless of
  the passing peer-dep check. Checked exactly where ag-grid dropped that
  API (v30 still has it, v32 doesn't) and presented the user with the
  real choice — stop at Angular 21, or take on the ag-grid v28→32 bump
  (the *minimum* viable version, well short of latest `36.x`) as part of
  this plan. User chose to include it. See Task 3 for what that bump
  actually required.
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
- Frontend tests: **discovered mid-Task-1** that `AGENTS.md`'s
  Karma/Jasmine testing section is stale — commit `e5f84c9 build(web):
  migrate frontend tests from Karma/Jasmine to Jest` (unrelated to this
  plan, landed on `main` before this plan started) removed
  `karma.conf.js` entirely. The frontend now runs on Jest: `npm test`
  (plain `jest`, no flags needed) for the full suite, or
  `npx jest <pattern-matching-part-of-a-spec-filename>` for a subset —
  no temporary config file needed at all. Every later reference in this
  plan to "recreate the temporary Karma config" means: just run the
  Jest command directly instead.

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

```bash
npx jest
npx ng build --configuration production
```
Expected: full Jest suite passes (22 suites / 99 tests as of this
plan), build succeeds. **Actual result:** confirmed — 22/22 suites,
99/99 tests, clean build (only pre-existing ag-grid Sass deprecation
warnings, unrelated).

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

**Actual result:** completed with 62 files migrated to block control-flow
syntax (`*ngIf`/`*ngFor` → `@if`/`@for`), plus 5 files it flagged and left
unmigrated (structural cases it can't safely auto-convert — duplicate
`ng-template` names, `[ngSwitch]` on `<th>`/`<ng-template>` elements: see
`nav-item.component.html`, `mat-table-dynamic.component.html`,
`main-calendar.component.html`, `mat-table.component.html`,
`manage-users.component.html`). This is expected and not a blocker — the
old structural-directive syntax still works in Angular 21, it's just
deprecated. Left as-is; a future cleanup pass can finish those 5 by hand.

- [ ] **Step 2b: Bump `@angular-builders/custom-webpack` (not covered by `ng update`)**

`ng update` only manages Angular's own first-party packages — this repo's
custom webpack config depends on a separate package that has its own
Angular-version-tied major releases and needs bumping by hand:
```bash
npm install @angular-builders/custom-webpack@21.1.0
```

- [ ] **Step 3: Confirm TypeScript stays at 5.9.3 for this step**

TypeScript is already `5.9.3` (unchanged from before this plan) — no
action needed here. See this plan's Global Constraints for why 6.0.3
does *not* belong in this step (it breaks `@angular-devkit/build-angular
@21`'s peer-dep range), even though the original version of this plan
said otherwise.

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

```bash
npx jest
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

**Actual result:** Step 6 failed on the first attempt — 17 of 22 Jest
suites wouldn't compile (see the TypeScript 6.0.3 finding recorded in
this plan's Global Constraints and Step 3). Root-caused via `npm ls
typescript`, which surfaced the real "invalid" peer-dep chain rather
than guessing from the compile errors alone. After reverting TypeScript
to 5.9.3 (Step 3, corrected): 22/22 suites, 99/99 tests, clean
production build.

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

- [ ] **Step 0: Resolve two unplanned peer conflicts before `ng update` can even run**

`ng update`'s own preflight check found two dependencies added to this
repo since this plan was written, both capped at Angular 20 with no
newer-Angular-compatible release *assumed* at plan-writing time — turned
out both actually do have one:
```bash
npm view @ng-bootstrap/ng-bootstrap@latest peerDependencies --json
npm view ngx-cookie-service@latest peerDependencies --json
```
Confirmed `@ng-bootstrap/ng-bootstrap@21.0.0` and
`ngx-cookie-service@22.0.0` both require Angular `^22.0.0`:
```bash
npm install @ng-bootstrap/ng-bootstrap@21.0.0 ngx-cookie-service@22.0.0
```
Commit this alone first — `ng update` refuses to run against a dirty
tree:
```bash
git add packages/web/package.json packages/web/package-lock.json
git commit -m "chore(web): bump ng-bootstrap and ngx-cookie-service ahead of Angular 22"
```

- [ ] **Step 1: Run Angular's official update to v22**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 24.19.0
cd /Users/olegteslenko/Desktop/T/tslen-workhub/packages/web
npx ng update @angular/core@22 @angular/cli@22 @angular/cdk@22 @angular/material@22
```
**Actual result:** blocked again, on `@angular-eslint/*` (still 21.4.0),
`@angular-builders/custom-webpack` (still 21.1.0), and
`@typescript-eslint/*` (still capped `<6.0.0`) — all three are things
this task's later steps already bump, `ng update`'s own preflight just
runs before I'd had the chance. Re-ran with `--force`, matching this
plan's documented fallback, since all three are already known-resolvable
by the very next steps:
```bash
npx ng update @angular/core@22 @angular/cli@22 @angular/cdk@22 @angular/material@22 --force
```
Completed cleanly: 114 files updated, mostly adding explicit
`changeDetection: ChangeDetectionStrategy.Eager` (Angular 22 changed the
default change-detection strategy; this migration opts every existing
component into the old default explicitly, preserving current behavior
rather than silently changing it) plus two small `tsconfig.app.json`
migrations for template-diagnostics defaults. No manual fixes needed
for this step specifically.

- [ ] **Step 1b: Bump `@angular-builders/custom-webpack` again (same reason as Task 2 Step 2b — `ng update` doesn't manage it)**

```bash
npm view @angular-builders/custom-webpack@latest peerDependencies --json
```
Confirm it now requires `@angular/compiler-cli: ^22.0.0` (this was
already checked while writing this plan — `22.0.1` is latest and
matches), then:
```bash
npm install @angular-builders/custom-webpack@22.0.1
```

- [ ] **Step 2: Bump TypeScript to 6.0.3, and bump typescript-eslint alongside it**

TypeScript is still `5.9.3` going into this task (Task 2 kept it there
after the `@angular-devkit/build-angular@21` peer-dep conflict). Before
bumping, verify `@angular-devkit/build-angular@22`'s actual TypeScript
range rather than assuming — the same assumption error happened once
already in this plan:
```bash
npm view @angular-devkit/build-angular@22.1.3 peerDependencies --json
```
Expected: a range that includes `6.0.3` (this was independently
confirmed via `@angular/compiler-cli@22.1.3`'s own peer dep,
`>=6.0 <6.1`, while writing this plan — this step just double-checks
`build-angular` agrees before relying on it, the way `compiler-cli`
alone turned out not to be sufficient evidence in Task 2).

`@typescript-eslint/eslint-plugin`/`@typescript-eslint/parser`/
`typescript-eslint` at their currently-installed `8.57.2`/`8.36.0`
versions cap at `typescript <6.0.0` — bump these *before* TypeScript
itself, to `8.67.0` (the latest, which accepts `>=4.8.4 <6.1.0`):
```bash
npm install --save-dev @typescript-eslint/eslint-plugin@8.67.0 @typescript-eslint/parser@8.67.0 typescript-eslint@8.67.0
npm install --save-dev typescript@6.0.3
```

Then confirm no "invalid" peer-dep chain resulted:
```bash
npm ls typescript 2>&1 | grep -i invalid
```
Expected, and **actual result**: no output (nothing invalid) — unlike
Task 2's TypeScript attempt, this one resolved cleanly on the first try
because the typescript-eslint bump happened first this time.

- [ ] **Step 3: Bump `@angular-eslint/*` to their v22-compatible versions**

`22.1.0` is the latest stable release compatible with `@angular/cli`
22.x:
```bash
npm install --save-dev @angular-eslint/builder@22.1.0 @angular-eslint/eslint-plugin@22.1.0 @angular-eslint/eslint-plugin-template@22.1.0 @angular-eslint/schematics@22.1.0 @angular-eslint/template-parser@22.1.0
```

- [ ] **Step 3b: Fix TypeScript 6.0's `strict` default change (found here, applies going forward)**

**Actual result — this was the real blocker, twice.** Both this task
and Task 2's first (reverted) TypeScript-6.0.3 attempt hit the identical
symptom: ~17 of 22 Jest suites failing to compile with widespread
`strictPropertyInitialization`/`noImplicitAny` errors on code that had
never been strict-mode clean. Root-caused via `npm ls` (ruled out a
peer-dep mismatch — none found this time) and direct empirical testing
of `ts.getDefaultCompilerOptions()` (`strict`/`noImplicitAny`/
`strictPropertyInitialization` all report `undefined` — TypeScript
6.0.3's own bare defaults are unchanged) against a plain `npx tsc
--noEmit -p tsconfig.spec.json` run (which *does* enforce these checks
with the same tsconfig). Confirmed by testing the fix directly: adding
`"strict": false` explicitly to `tsconfig.json` makes `tsc --noEmit`
pass with zero errors. This means TypeScript 6.0 changed how it
*interprets an absent `strict` key* (not its own reported default) —
this codebase was never written to be strict-mode clean, so making the
existing (implicit, pre-6.0) posture explicit is the correct fix, not a
scope change into "make this codebase strict-mode compliant."

Also needed `"ignoreDeprecations": "6.0"` in the same file first —
TypeScript 6.0 deprecated `baseUrl` and `downlevelIteration` (both set
in this project's tsconfig), and without suppressing that, even a plain
`tsc --noEmit` aborts on a config-validation error before reaching real
type-checking at all.

```json
{
  "compilerOptions": {
    "ignoreDeprecations": "6.0",
    "strict": false,
    ...
  }
}
```
(Both keys go in `packages/web/tsconfig.json`, at the top of
`compilerOptions` — see the actual file for exact placement.)

- [ ] **Step 3c: ag-grid v28→32 bump (scope change approved by user mid-task) + fix its two removed-API/theming fallout points**

**This is the real Task 3 detour.** The production build failed with
three occurrences of the same root cause — `ComponentFactoryResolver`,
removed from `@angular/core` in Angular 22, still imported by
`ag-grid-angular@28.2.1` (2 occurrences) and `ngx-toastr@18.0.0` (1).
Checked exactly which ag-grid version dropped that import (v30 still has
it, v32 doesn't — confirmed via unpkg, not guessed) and presented the
user the real choice: stop at Angular 21, or take on the *minimum*
ag-grid bump (v32, not latest v36) as part of this task. **User chose to
include it.**

```bash
npm install ag-grid-angular@32.3.9 ag-grid-community@32.3.9
npm install ngx-toastr@20.0.5
```
(`ngx-toastr@20.0.5`'s own peer dep still formally only claims
`@angular/core: ^21.0.0` — installed anyway since the actual build
error was specifically about the now-removed API, which a well-maintained
package bumping for Angular 21 would already have had to stop using;
confirmed this was correct by the build passing afterward.)

ag-grid v32 also dropped the Sass *source* files this repo's
`src/scss/ag-custom/_ag-custom.scss` imported from (only precompiled CSS
themes ship now) and moved every theme file from a `dist/styles/` path
to a flat `styles/` path (`src/styles.scss` had its own separate,
now-broken references to the old paths too). Fixed by:
- Removing `_ag-custom.scss`'s `@include ag-theme-material();` call (the
  mixin no longer exists) — every rule below it in that file is plain
  CSS, not mixin-dependent, so it still applies unchanged.
- Importing the precompiled `~ag-grid-community/styles/ag-grid.css` and
  `~ag-grid-community/styles/ag-theme-material.css` instead (the
  `~package-name/...` webpack-module-resolution import syntax, not a
  relative `../../../node_modules/...` path — the relative form resolves
  incorrectly here because the import chain runs through multiple Sass
  partials before reaching the entry `styles.scss`, and CSS-file
  `@import` resolution follows the *bundled* location, not the source
  partial's own directory).
- Removing `src/styles.scss`'s own separate, now-redundant
  `ag-theme-material.css` import (duplicate of the one in
  `_ag-custom.scss`) and its `ag-theme-alpine`/`ag-theme-alpine-dark`
  imports entirely — grepped the app and confirmed neither class is
  referenced by any component (only `ag-theme-material` is, in
  `manage-users-aggrid`, `pending-aggrid`, `ag-grid-table`), and
  `ag-theme-alpine-dark.css` no longer exists as a separate file in v32
  regardless.

Also fixed the one place *this app's own code* used the removed API —
`src/app/tslen-components/mat-table-dynamic/mat-table-dynamic.component.ts`
imported `ComponentFactoryResolver`, `Injector`, and `StaticProvider`
from `@angular/core` but used none of them anywhere in the file (dead
imports, confirmed by reading the full file) — removed the import, no
other change needed.

- [ ] **Step 4: Run the full frontend verification**

Same as Task 2 Step 6 (`npx jest`, then `npx ng build --configuration production`).

**Actual result:** after Steps 3b and 3c above — 22/22 suites, 99/99
tests, clean production build. (Getting here took several failed
attempts at each step; this plan now reflects the working sequence, not
the exploration order — see the "Actual result" notes throughout Task 3
for what was actually tried and ruled out.)

- [ ] **Step 5: If anything fails, use systematic-debugging**

Same as Task 2 Step 7 — root-cause any failure before attempting a fix.

- [ ] **Step 6: Run the backend suite as a regression check**

Same as Task 2 Step 8. **Actual result:** 79/79 suites, 350/350 tests —
unaffected, as expected for a frontend-only dependency bump.

- [ ] **Step 7: Run the root lint (matches what CI actually runs)**

```bash
cd /Users/olegteslenko/Desktop/T/tslen-workhub
npm run lint
```
Expected: passes. (A prior session fixed root lint crashing on
`packages/web`'s missing plugins — this step confirms that fix still
holds after two Angular major bumps and the `@angular-eslint/*` updates
in this plan.) **Actual result:** 0 errors, 5 pre-existing unused-var
warnings in backend files this plan never touched — exit code 0.

- [ ] **Step 8: Commit**

```bash
cd /Users/olegteslenko/Desktop/T/tslen-workhub
git add packages/web/package.json packages/web/package-lock.json packages/web/tsconfig.json packages/web/tsconfig.app.json
git add -u packages/web/src
git commit -m "chore(web): update Angular to v22, bump ag-grid to v32"
```
(`tsconfig.json`/`tsconfig.app.json` need their own explicit `git add`
here — neither is under `packages/web/src`, so `git add -u
packages/web/src` alone misses both the Step 3b `ignoreDeprecations`/
`strict` change and Step 1's `ng update`-authored `tsconfig.app.json`
migrations.)

---

## Task 4: Manual end-to-end verification

**Files:**
- Modify: `packages/web/tsconfig.json` (found live during Step 2, see
  "Actual result" note below)

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

**Actual result:** `npm start`'s `prestart` hook (`npm run config` →
`ts-node set-env.ts`) initially failed with `TS2591: Cannot find name
'require'` / `TS2304: Cannot find name 'process'/'__dirname'`. Reproduced
directly via `npx ts-node set-env.ts`. Root cause: `tsconfig.app.json` and
`tsconfig.spec.json` both already set `"types": ["node"]` (`["jest",
"node"]` for the latter), but the bare root `packages/web/tsconfig.json`
— which `ts-node` falls back to for this standalone script, since there's
no dedicated ts-node config — had no explicit `types` field, and the
automatic-inclusion default no longer picked up `@types/node` correctly
under TypeScript 6.0. Fix: added `"types": ["node"]` to
`packages/web/tsconfig.json`, matching the pattern already used in both
children. Verified via direct re-run (`npx ts-node set-env.ts` succeeds)
and re-ran `npx jest` and `npx ng build --configuration production` to
confirm nothing else broke.

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

**Actual result:** Full local CI-equivalent run (Step 1) passed: lint,
`test:e2e`, `test:unit` all green under Node 24.19.0. Browser smoke-test
(Step 2, via Claude-in-Chrome) covered: main-wall (clean), tasks-manager
board list, `/admin/pending` (the ag-grid-based page — chosen specifically
to verify the ag-grid v28→32 migration renders real data correctly: it
does, columns and rows render with no console errors), and the task
detail dialog on `tasks-list` (opened a card, typed into the Assignee
autocomplete, selected a suggestion and confirmed the removable chip
renders, posted a comment and saw it appear with author/timestamp, saved
the dialog and confirmed the card updated with the new assignee avatar).
No console errors on any page. One fix required, documented above
(`tsconfig.json` `types: ["node"]`) — committed alongside this note.

- [ ] **Step 4: Commit**

```bash
git add packages/web/tsconfig.json docs/superpowers/plans/2026-08-24-node-angular-version-bump.md
git commit -m "fix(web): add explicit node types to root tsconfig for ts-node scripts"
```
