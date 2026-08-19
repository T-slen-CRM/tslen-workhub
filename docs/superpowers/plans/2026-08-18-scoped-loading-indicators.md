# Scoped Loading Indicators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the full-page loading overlay with loading indicators scoped to the specific button or card that triggered a request, keeping the global overlay only as an explicit fallback for page-wide cases.

**Architecture:** `LoadingLogoComponent` stops reading the global `LoaderService` internally and instead takes `isLoading`/`fixed` as signal inputs, with its CSS split so the default is `position: absolute` (scoped to the caller's own positioned container) and `fixed` opts into the old viewport-wide `position: fixed` behavior. `LoaderService.isLoading` becomes a plain `signal<boolean>` (from a `BehaviorSubject`). `AdminComponent`'s single instance becomes the one explicit `[fixed]="true"` fallback. A new standalone `LoadingButtonComponent` gives future buttons a reusable, width-stable spinner-swap pattern.

**Tech Stack:** Angular 20 (signals: `input()`, `signal()`), Angular Material `MatProgressSpinnerModule`, Karma/Jasmine.

**Spec:** `docs/superpowers/specs/2026-08-18-scoped-loading-indicators-design.md`

## Global Constraints

- Signal inputs (`input()`), not `@Input()` decorators, per `AGENTS.md`'s Angular conventions.
- `LoadingLogoComponent` stays `standalone: false` (declared in `HelpersModule`, unchanged) — only its inputs/template/CSS change.
- `LoadingButtonComponent` is a new `standalone: true` component (split `.ts`/`.html`/`.scss` files, matching every other standalone component under `helpers/`/`tslen-components/`).
- Default overlay positioning is `position: absolute` (scoped); `[fixed]="true"` opts into `position: fixed` (viewport-wide) — only `admin.component.html`'s single instance passes `fixed`.
- `LoaderInterceptor` is untouched — it keeps counting every in-flight request via `reqCountInc`/`reqCountDec`.
- No template changes needed in `card.component.html`, `tasks-manager.component.html`, `auth-signin.component.html`, or `auth-reset-password.component.html` — they already pass a locally-owned boolean into `logoLoading`/`loading`; only `LoadingLogoComponent` itself needs to change for those to render scoped correctly.
- No existing buttons are converted to `LoadingButtonComponent` in this pass — that audit is explicitly out of scope (see spec).

---

### Task 1: `LoaderService` — `BehaviorSubject` to `signal`

**Files:**
- Modify: `packages/web/src/app/services/loader.service.ts`
- Test: `packages/web/src/app/services/loader.service.spec.ts` (new)

**Interfaces:**
- Produces: `LoaderService.isLoading: Signal<boolean>` (a signal, called as `isLoading()` to read) — replaces the current `isLoading: BehaviorSubject<boolean>`. `reqCountInc()`/`reqCountDec()`/`show()`/`hide()` keep their existing names and no-argument signatures. The public `reqCount` getter/setter is removed (nothing outside this file used it).

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/app/services/loader.service.spec.ts`:

```typescript
import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { LoaderService } from './loader.service';

describe('LoaderService', () => {
  let service: LoaderService;

  beforeEach(() => {
    service = new LoaderService();
  });

  it('sets isLoading to true once the first request starts', fakeAsync(() => {
    service.reqCountInc();
    flushMicrotasks();

    expect(service.isLoading()).toBe(true);
  }));

  it('keeps isLoading true while a second request is still in flight', fakeAsync(() => {
    service.reqCountInc();
    service.reqCountInc();
    flushMicrotasks();

    service.reqCountDec();
    flushMicrotasks();

    expect(service.isLoading()).toBe(true);
  }));

  it('sets isLoading to false once all in-flight requests complete', fakeAsync(() => {
    service.reqCountInc();
    service.reqCountInc();
    flushMicrotasks();

    service.reqCountDec();
    service.reqCountDec();
    flushMicrotasks();

    expect(service.isLoading()).toBe(false);
  }));

  it('does not go below zero when reqCountDec is called with no in-flight requests', fakeAsync(() => {
    service.reqCountDec();
    flushMicrotasks();

    expect(service.isLoading()).toBe(false);
  }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `packages/web/`, after `nvm use v22.22.2`): `npx ng test --include='**/loader.service.spec.ts'`
Expected: FAIL — `service.isLoading is not a function` (it's currently a `BehaviorSubject`, not a signal, so calling it as `isLoading()` throws a TypeError).

- [ ] **Step 3: Write minimal implementation**

Replace the full contents of `packages/web/src/app/services/loader.service.ts`:

```typescript
import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class LoaderService {

    public isLoading = signal(false);

    private reqCount = 0;

    public show() {
        // Deferred to a microtask so this doesn't emit synchronously mid
        // change-detection pass (e.g. when an HTTP request is fired from a
        // component's ngOnInit/constructor during initial render) - emitting
        // there flips isLoading within the same tick a parent's async pipe
        // already checked it, which throws NG0100 in dev mode.
        queueMicrotask(() => this.isLoading.set(true));
    }

    public hide() {
        queueMicrotask(() => this.isLoading.set(false));
    }

    public reqCountInc(): void {
        this.reqCount++;
        if (this.reqCount === 1) {
            this.show();
        }
    }

    public reqCountDec(): void {
        if (this.reqCount > 0) {
            this.reqCount--;
        }
        if (!this.reqCount) {
            this.hide();
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test --include='**/loader.service.spec.ts'`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/services/loader.service.ts packages/web/src/app/services/loader.service.spec.ts
git commit -m "refactor(web): convert LoaderService.isLoading from BehaviorSubject to signal"
```

---

### Task 2: `LoadingLogoComponent` — signal inputs, scoped-by-default overlay

**Files:**
- Modify: `packages/web/src/app/helpers/loading-logo/loading-logo.component.ts`
- Modify: `packages/web/src/app/helpers/loading-logo/loading-logo.component.html`
- Modify: `packages/web/src/app/helpers/loading-logo/loading-logo.component.scss`
- Test: `packages/web/src/app/helpers/loading-logo/loading-logo.component.spec.ts` (new)

**Interfaces:**
- Consumes: nothing from Task 1 directly (this component no longer injects `LoaderService` at all).
- Produces: `LoadingLogoComponent` inputs — `imagePath = input('/assets/images/.png')`, `isLoading = input(false)`, `fixed = input(false)`. Task 3 binds to `isLoading`/`fixed` from `AdminComponent`'s template.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/app/helpers/loading-logo/loading-logo.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { LoadingLogoComponent } from './loading-logo.component';

describe('LoadingLogoComponent', () => {
  let fixture: ComponentFixture<LoadingLogoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoadingLogoComponent],
      imports: [CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingLogoComponent);
  });

  it('does not render the overlay when isLoading is false', () => {
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.overlay')).toBeNull();
  });

  it('renders the overlay scoped to its container by default', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.classList.contains('overlay--fixed')).toBe(false);
  });

  it('renders the overlay viewport-wide when fixed is true', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.componentRef.setInput('fixed', true);
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.overlay');
    expect(overlay.classList.contains('overlay--fixed')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --include='**/loading-logo.component.spec.ts'`
Expected: FAIL — `fixture.componentRef.setInput('isLoading', ...)` throws because `LoadingLogoComponent` has no `isLoading` input yet (it currently derives loading state internally from `LoaderService`, not from an input).

- [ ] **Step 3: Write minimal implementation**

Replace `packages/web/src/app/helpers/loading-logo/loading-logo.component.ts`:

```typescript
import { Component, input } from '@angular/core';

@Component({
    selector: 'app-loading-logo',
    templateUrl: './loading-logo.component.html',
    styleUrls: ['./loading-logo.component.scss'],
    standalone: false
})
export class LoadingLogoComponent {
    public imagePath = input('/assets/images/.png');
    public isLoading = input(false);
    public fixed = input(false);
}
```

Replace `packages/web/src/app/helpers/loading-logo/loading-logo.component.html`:

```html
<div *ngIf="isLoading()" class="overlay" [class.overlay--fixed]="fixed()">
    <div class="spinner"></div>
</div>
```

In `packages/web/src/app/helpers/loading-logo/loading-logo.component.scss`, replace the `.overlay` rule (keep everything else — `.spinner`, `::before`/`::after`, `@keyframes` — unchanged):

```scss
.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.overlay--fixed {
  position: fixed;
  top: 0;
  left: 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test --include='**/loading-logo.component.spec.ts'`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/helpers/loading-logo/
git commit -m "fix(web): scope LoadingLogoComponent's overlay to its container by default"
```

---

### Task 3: Wire `AdminComponent`'s fallback overlay explicitly

**Files:**
- Modify: `packages/web/src/app/theme/layout/admin/admin.component.ts`
- Modify: `packages/web/src/app/theme/layout/admin/admin.component.html`

**Interfaces:**
- Consumes: `LoaderService.isLoading` (Task 1, `Signal<boolean>`), `LoadingLogoComponent`'s `isLoading`/`fixed` inputs (Task 2).

No new automated test for this task: `AdminComponent`'s constructor already pulls in `MatDialog`, `LiveKitWebSocketService`, `Router`, `ChildrenOutletContexts`, and `Location` — standing up a full `TestBed` for this class to check one template binding would mean mocking five unrelated collaborators for no real regression coverage, since the actual logic (does the overlay render when `isLoading` is true, is `fixed` applied) is already covered by Task 2's `LoadingLogoComponent` spec. Verify this task with `ng build` (confirms the template compiles against the new signal-based inputs) plus the manual check in Step 3 below.

- [ ] **Step 1: Inject `LoaderService`**

In `packages/web/src/app/theme/layout/admin/admin.component.ts`, add the import and a field next to the existing `liveChatService` injection:

```typescript
import { LoaderService } from '../../../services/loader.service';
```

```typescript
  private liveChatService: LiveChatService = inject(LiveChatService);
  public loaderService: LoaderService = inject(LoaderService);
```

(`loaderService` is `public` because the template reads it directly, same as `activeCallData`.)

- [ ] **Step 2: Update the template binding**

In `packages/web/src/app/theme/layout/admin/admin.component.html`, change:

```html
<app-loading-logo></app-loading-logo>
```

to:

```html
<app-loading-logo [isLoading]="loaderService.isLoading()" [fixed]="true"></app-loading-logo>
```

- [ ] **Step 3: Verify manually**

Run (from `packages/web/`, after `nvm use v22.22.2`): `npx ng build`
Expected: clean build, no template type errors.

Then start the app (`npx ng serve`), log in, and trigger any API call from a page that has no local loading flag (e.g. navigate between two `pages/` routes quickly) — confirm the full-page overlay still appears/disappears as before. Separately, open a page with a card that passes its own `logoLoading`/`loading` boolean (e.g. `admin/manage-users/manage-user-update`) and trigger its local loading state — confirm it no longer blacks out the whole page, only the card's own area.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/theme/layout/admin/admin.component.ts packages/web/src/app/theme/layout/admin/admin.component.html
git commit -m "fix(web): make AdminComponent's full-page loading overlay an explicit fallback"
```

---

### Task 4: New `LoadingButtonComponent`

**Files:**
- Create: `packages/web/src/app/helpers/loading-button/loading-button.component.ts`
- Create: `packages/web/src/app/helpers/loading-button/loading-button.component.html`
- Create: `packages/web/src/app/helpers/loading-button/loading-button.component.scss`
- Test: `packages/web/src/app/helpers/loading-button/loading-button.component.spec.ts` (new)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `LoadingButtonComponent` — selector `app-loading-button`, standalone, single input `loading = input(false)`. Not wired into any consumer in this plan (see Global Constraints) — available for future use as `<app-loading-button [loading]="x">Label</app-loading-button>` nested inside the real `<button [disabled]="x">`.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/app/helpers/loading-button/loading-button.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingButtonComponent } from './loading-button.component';

describe('LoadingButtonComponent', () => {
  let fixture: ComponentFixture<LoadingButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingButtonComponent);
  });

  it('shows the projected content and no spinner when not loading', () => {
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();

    const content = fixture.nativeElement.querySelector('.loading-button-content');
    expect(content.classList.contains('loading-button-content--hidden')).toBe(false);
    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeNull();
  });

  it('hides the projected content and shows a spinner when loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const content = fixture.nativeElement.querySelector('.loading-button-content');
    expect(content.classList.contains('loading-button-content--hidden')).toBe(true);
    expect(fixture.nativeElement.querySelector('mat-spinner')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --include='**/loading-button.component.spec.ts'`
Expected: FAIL — compile error, `loading-button.component.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `packages/web/src/app/helpers/loading-button/loading-button.component.ts`:

```typescript
import { Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-button',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  templateUrl: './loading-button.component.html',
  styleUrl: './loading-button.component.scss',
})
export class LoadingButtonComponent {
  public loading = input(false);
}
```

Create `packages/web/src/app/helpers/loading-button/loading-button.component.html`:

```html
<span class="loading-button-content" [class.loading-button-content--hidden]="loading()">
  <ng-content></ng-content>
</span>
@if (loading()) {
  <mat-spinner class="loading-button-spinner" [diameter]="20"></mat-spinner>
}
```

Create `packages/web/src/app/helpers/loading-button/loading-button.component.scss`:

```scss
:host {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.loading-button-content--hidden {
  visibility: hidden;
}

.loading-button-spinner {
  position: absolute;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test --include='**/loading-button.component.spec.ts'`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/helpers/loading-button/
git commit -m "feat(web): add reusable LoadingButtonComponent"
```

---

### Task 5: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full frontend spec suite**

From `packages/web/`, after `nvm use v22.22.2`: `npx ng test --watch=false` (or the project's existing one-off headless Karma config, if already set up in this environment).
Expected: all specs pass, including the 3 new files from Tasks 1, 2, 4 and the existing suite (no regression).

- [ ] **Step 2: Run a full build**

`npx ng build`
Expected: clean build.

- [ ] **Step 3: Manual visual check**

Repeat Task 3 Step 3's manual check end-to-end in the browser: confirm a card-scoped loading state (`manage-user-update` or `notification-form`) shows a spinner scoped to the card, not a full-page blackout, and that a page-wide case (e.g. initial route load with no local loading flag) still shows the full-page overlay as before.

- [ ] **Step 4: Report completion**

No further commit needed for this task — Tasks 1-4 already committed their own changes.
