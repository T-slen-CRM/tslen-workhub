# Scoped Loading Indicators — Design

## Problem

Every HTTP request in the app currently drives one global full-page
overlay: `LoaderInterceptor` increments/decrements a request counter on
`LoaderService`, which flips `isLoading`; the single `<app-loading-logo>`
instance mounted in `admin.component.html` shows/hides based on that flag.
Any API call anywhere — a background poll, a card's own data fetch, a
button click — blacks out the whole screen.

Four other places already try to scope loading locally by passing their
own boolean into `<app-loading-logo>` (`card.component.html`'s
`logoLoading` input, `tasks-manager.component.html`, both auth pages) and
wrap it in a `.loading-div { position: absolute; width:100%; height:100%
}` sized to their own container. That attempt is defeated by
`LoadingLogoComponent` itself: it hardcodes `.overlay { position: fixed;
width:100%; height:100% }` internally, breaking out of `.loading-div`'s
positioning context to cover the full viewport regardless of where it's
placed in the DOM, and it also re-subscribes to the same global
`LoaderService.isLoading` flag underneath whatever local boolean the
parent passed — so it lights up on *any* in-flight request app-wide, not
specifically the request the local card/page cares about.

## Goal

Loading feedback should be scoped to the specific button or card that
triggered a request, not the whole page. The global full-page overlay is
kept only as an explicit fallback for genuinely page-wide cases (initial
route/auth resolution) — not as the default for regular API calls.

## Design

### 1. `LoadingLogoComponent` — decouple from the global service, fix positioning

Currently: injects `LoaderService`, subscribes to its `isLoading`
`BehaviorSubject` internally, `@Input() imagePath` only.

Change to:

```typescript
@Component({
  selector: 'app-loading-logo',
  templateUrl: './loading-logo.component.html',
  styleUrls: ['./loading-logo.component.scss'],
  standalone: false,
})
export class LoadingLogoComponent {
  public imagePath = input('/assets/images/.png');
  public isLoading = input(false);
  public fixed = input(false);
}
```

No constructor, no `LoaderService` injection, no `ngOnInit` — the default
`imagePath` value moves into the signal `input()` declaration itself.

Template:

```html
<div *ngIf="isLoading()" class="overlay" [class.overlay--fixed]="fixed()">
  <div class="spinner"></div>
</div>
```

CSS: split `.overlay`'s positioning from its other properties. Default
(no modifier) is `position: absolute; inset: 0;` — sized to the nearest
positioned ancestor (the `.loading-div` wrapper each caller already
provides). `.overlay--fixed` adds `position: fixed; top: 0; left: 0;`
for the viewport-wide case. `width`/`height`/`background-color`/`z-index`
stay shared between both.

This one change fixes all 4 existing local usages with no template
changes on their side — they already pass a locally-owned boolean into
`logoLoading`/`loading`, which now reaches `LoadingLogoComponent` as
`[isLoading]` and renders scoped to their own `.loading-div` instead of
the viewport.

### 2. Admin fallback — explicit opt-in, kept for page-wide cases only

`LoaderService.isLoading` changes from a `BehaviorSubject<boolean>` to a
plain writable signal:

```typescript
@Injectable({ providedIn: 'root' })
export class LoaderService {
  public isLoading = signal(false);
  private reqCount = 0;

  public show() {
    queueMicrotask(() => this.isLoading.set(true));
  }

  public hide() {
    queueMicrotask(() => this.isLoading.set(false));
  }

  public reqCountInc(): void {
    this.reqCount++;
    if (this.reqCount === 1) this.show();
  }

  public reqCountDec(): void {
    if (this.reqCount > 0) this.reqCount--;
    if (!this.reqCount) this.hide();
  }
}
```

(`reqCount` becomes a private field instead of the current public
getter/setter pair — nothing outside `LoaderService` reads or writes it.)

`LoaderInterceptor` is untouched — it still calls `reqCountInc`/`reqCountDec`
on every request and stays the mechanism behind the fallback overlay.

`admin.component.html`'s single instance becomes:

```html
<app-loading-logo [isLoading]="loaderService.isLoading()" [fixed]="true"></app-loading-logo>
```

with `AdminComponent` injecting `LoaderService` (`private loaderService =
inject(LoaderService)`) so the template can read the signal directly —
no async pipe needed.

### 3. New `LoadingButtonComponent` — reusable button-level spinner

Extracts the existing ad-hoc pattern in
`auth-signup.component.html` (`[disabled]="loading"` + `@if(loading){
<mat-spinner> } @else { label }`) into a small standalone component so
future buttons don't hand-roll it, and so toggling loading doesn't change
the button's width (the current ad-hoc pattern swaps content entirely,
which can shift a button narrower when the spinner is shorter than its
label).

```typescript
@Component({
  selector: 'app-loading-button',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <span class="loading-button-content" [class.loading-button-content--hidden]="loading()">
      <ng-content></ng-content>
    </span>
    @if (loading()) {
      <mat-spinner class="loading-button-spinner" [diameter]="20"></mat-spinner>
    }
  `,
  styles: [`
    :host { position: relative; display: inline-flex; align-items: center; justify-content: center; }
    .loading-button-content--hidden { visibility: hidden; }
    .loading-button-spinner { position: absolute; }
  `],
})
export class LoadingButtonComponent {
  public loading = input(false);
}
```

Usage — the real `<button>` keeps owning `disabled` and the click
handler; `<app-loading-button>` only owns the visual swap:

```html
<button mat-raised-button [disabled]="loading">
  <app-loading-button [loading]="loading">Submit</app-loading-button>
</button>
```

No existing buttons are converted to this component in this pass beyond
documenting the pattern — that audit is a separate follow-up (see Out of
Scope).

## Files touched

- `packages/web/src/app/helpers/loading-logo/loading-logo.component.ts` — signal inputs, drop `LoaderService` injection.
- `packages/web/src/app/helpers/loading-logo/loading-logo.component.html` — read inputs as function calls, add `.overlay--fixed` class binding.
- `packages/web/src/app/helpers/loading-logo/loading-logo.component.scss` — split `position: fixed` into the `--fixed` modifier; default becomes `position: absolute; inset: 0`.
- `packages/web/src/app/services/loader.service.ts` — `BehaviorSubject` → `signal`, drop public `reqCount` getter/setter.
- `packages/web/src/app/theme/layout/admin/admin.component.ts` — inject `LoaderService`.
- `packages/web/src/app/theme/layout/admin/admin.component.html` — bind `[isLoading]`/`[fixed]` explicitly.
- New: `packages/web/src/app/helpers/loading-button/loading-button.component.ts` + `.html` + `.scss` (split files, matching every other standalone component in `helpers/`/`tslen-components/` — the inline template above is illustrative, not literal).

No template changes needed in `card.component.html`, `tasks-manager.component.html`, `auth-signin.component.html`, or `auth-reset-password.component.html` — they already pass the correct local boolean; only the CSS/component fix is required for them to render scoped to their own container.

## Testing

- `loader.service.spec.ts` (new, no existing test file for this service): assert `reqCountInc`/`reqCountDec` pairing sets/clears `isLoading()` correctly, including the multi-request case (two `reqCountInc()` calls, one `reqCountDec()` should leave `isLoading()` true).
- `loading-logo.component.spec.ts` (new): assert the overlay renders only when `isLoading()` is true, and that `.overlay--fixed` class is present only when `fixed()` is true.
- `loading-button.component.spec.ts` (new): assert content visibility toggles and the spinner renders only when `loading()` is true.
- Manual verification: `ng build` clean, existing frontend spec suite still green, and a manual check in-browser that triggering a card-scoped loading state (e.g. `manage-user-update`) no longer blacks out the full page.

## Out of Scope

- Auditing every button/action in the app that currently has no local
  loading flag and relies solely on the global overlay for feedback, and
  converting them to `LoadingButtonComponent`. Deferred to a follow-up
  pass once this foundation lands.
- Changing `LoaderInterceptor`'s behavior (it keeps counting every
  request) — only its consumer (`AdminComponent`'s fallback overlay)
  changes how it's wired.
