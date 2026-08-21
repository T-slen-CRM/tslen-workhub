# LiveKit Draggable Call Window + Cross-Tab Picture-in-Picture — Design

## Problem

`CallComponent` (`packages/web/src/app/pages/call/wellcome/call.component.ts`)
renders as a fixed-position overlay (`.call-window`, `position: fixed; top:
65px; right: 16px`) whenever `AdminComponent`'s `activeCallData()` signal is
truthy (`admin.component.html`'s `@if (activeCallData()) { <app-live-kit-call
.../> }`). Two things are missing:

1. The overlay's position is hardcoded — it can't be moved, so it can
   obscure whatever's underneath it with no way to reposition it.
2. The call is only visible while the app's own browser tab is the active
   one. Switching to another tab hides it entirely, unlike Google Meet,
   which keeps a small floating window visible across tab switches (and
   even outside the browser window) via the Document Picture-in-Picture
   API.

## Goal

1. The call window can be dragged to any position within the viewport.
2. When the user switches away from the app's tab during an active call,
   a small floating window (Chrome/Edge 116+ only — Document
   Picture-in-Picture isn't supported in Firefox/Safari) automatically
   shows a simplified glance-view: main video, a small self-view, a mic
   toggle, and a leave button. Returning to the tab, or closing that
   floating window, resumes the normal in-page overlay. In unsupported
   browsers this is a no-op — the call stays exactly as it is today
   (now also draggable).

## Design

### 1. Draggable call window — Angular CDK `DragDropModule`

`@angular/cdk` is already a project dependency and `cdkDrag` is already
used elsewhere in this codebase (`tasks-list.component.html`,
`task-phase-sort.component.html`) — no new dependency, matches existing
convention.

- `CallComponent`'s standalone `imports` gains `DragDropModule`.
- `call.component.html`: the outer `<div class="call-window" ...>` gains
  `cdkDrag` and `cdkDragBoundary="body"` (keeps it from being dragged
  outside the viewport). The existing `<div id="room-header" ...>` gains
  `cdkDragHandle`, so dragging only initiates from the header bar — the
  video area, and the header's own buttons/link-copy input, stay
  normally clickable (CDK only treats a pointerdown-then-move past a
  small threshold as a drag; a plain click still fires normally).
- No component/service code changes needed for this part — it's template
  + import only.

### 2. Cross-tab floating window — `PictureInPictureService`

New file: `packages/web/src/app/pages/live-kit/picture-in-picture.service.ts`,
`providedIn: 'root'`. Single responsibility: own the floating window's
whole lifecycle (open, build its DOM, wire its controls, close, clean up).
`CallComponent` doesn't touch `documentPictureInPicture` directly.

```typescript
export interface PictureInPictureHandles {
  getMainVideoTrack: () => VideoTrack | null;
  getSelfVideoTrack: () => VideoTrack | null;
  isMicEnabled: () => boolean;
  onToggleMic: () => void;
  onLeave: () => void;
}

@Injectable({ providedIn: 'root' })
export class PictureInPictureService {
  readonly isSupported: boolean =
    typeof (window as any).documentPictureInPicture !== 'undefined';

  isActive(): boolean;                                   // pipWindow is open
  async open(handles: PictureInPictureHandles): Promise<void>;
  close(): void;
}
```

- **`isSupported`**: computed once from `'documentPictureInPicture' in
  window`. `open()` is a no-op (resolves immediately, does nothing) when
  `false` — this is the entire fallback story for Firefox/Safari.
- **`open(handles)`**:
  - No-ops if `!isSupported` or already active (`isActive()`).
  - `const pipWindow = await (window as any).documentPictureInPicture.requestWindow({ width: 300, height: 220 });`
  - Builds the glance-view with raw DOM calls
    (`pipWindow.document.createElement(...)` / `.appendChild(...)`) —
    **not** Angular template rendering. Angular's `Renderer2`/component
    views are bound to the document they were bootstrapped in; they
    can't span two `Document` objects. A hand-rolled DOM tree is the
    correct tool here, matching how this pattern is done in practice
    (including by Meet itself).
  - Two `<video>` elements: a larger one for the main track, a smaller
    one (absolutely positioned corner overlay) for the self-view.
    **Tracks are not moved** — `handles.getMainVideoTrack()?.attach(mainVideoEl)`
    and `handles.getSelfVideoTrack()?.attach(selfVideoEl)` attach the
    *same* underlying `MediaStreamTrack` to a second `<video>` element.
    LiveKit's `Track.attach()` supports multiple simultaneous attachments
    per track, so the in-page overlay's own `<video-component>` instances
    keep playing unaffected the whole time — this is purely an additional
    view, not a handoff.
  - Two buttons: mic toggle (icon/label reflects `handles.isMicEnabled()`,
    click calls `handles.onToggleMic()` then re-reads the value to update
    its own label — no two-way binding machinery needed for two buttons)
    and leave (click calls `handles.onLeave()`, which itself triggers the
    existing `leaveRoom()` flow and — via `activeCallData` going
    null — this service's own `close()`, see below).
  - `pipWindow.addEventListener('pagehide', () => this.close())` —
    catches the user closing the floating window directly (the OS/browser
    chrome's own close button), not just programmatic closes.
- **`close()`**: no-ops if not active. Detaches both tracks
  (`track.detach(videoEl)` — detaching does not stop the track, only
  that element's playback of it), closes `pipWindow` if still open,
  clears internal state. Idempotent — safe to call from both the
  `visibilitychange` handler and the `pagehide` listener without special
  ordering.

### Known risk: user-activation requirement on `requestWindow()`

Unverified against the actual API at spec-writing time: whether
`documentPictureInPicture.requestWindow()` requires "transient user
activation" (a direct click/keypress on the page immediately before the
call) to succeed, the way the older `element.requestPictureInPicture()`
does. Switching browser tabs is a gesture on the *browser chrome*, not
on the page itself, so if `requestWindow()` does enforce this, the
`visibilitychange`-triggered `open()` call would reject/throw instead of
opening a window.

This must be checked first, as the first step of implementation, against
a real Chrome/Edge 116+ build — before writing the rest of
`PictureInPictureService`. If it turns out user activation *is* required
and tab-switching doesn't count, the fallback is to keep the
`visibilitychange` auto-trigger for the *common* case (many real Chrome
versions do allow this) but accept that some versions may silently fail
to open the window (falls back to no-op, same as the unsupported-browser
path) rather than blocking on redesigning the trigger — a manual "pop
out" button remains a fallback trigger option if the automatic path
turns out to be unreliable in practice, but is not part of this pass
unless the spike shows it's needed.

### 3. Wiring into `CallComponent`

- Constructor (or `ngOnInit`) adds a `document.addEventListener('visibilitychange', ...)`
  listener; `ngOnDestroy` removes it (`@HostListener` isn't used here
  since this needs an explicit reference to remove — a bound class
  method stored in a field, added/removed the normal
  `addEventListener`/`removeEventListener` way).
- Handler logic:
  ```typescript
  private onVisibilityChange = () => {
    const hasActiveRoom = !!this.room();
    if (document.visibilityState === 'hidden' && hasActiveRoom) {
      this.pip.open({
        getMainVideoTrack: () => this.getCurrentMainVideoTrack(),
        getSelfVideoTrack: () => this.localCameraTrack() ?? null,
        isMicEnabled: () => this.microphoneEnabled(),
        onToggleMic: () => this.setMicrophoneEnabled(!this.microphoneEnabled()),
        onLeave: () => this.leaveRoom(),
      });
    } else if (document.visibilityState === 'visible') {
      this.pip.close();
    }
  };
  ```
  `getCurrentMainVideoTrack()` (existing method, already has the
  right priority: manual selection > screen share > local camera > first
  remote video) sources the main glance-view track; `localCameraTrack()`
  (existing signal) sources the self-view.
- `leaveRoom()` itself is untouched — `onLeave` just calls it, and the
  existing `leaveRoomOutput` emit → `AdminComponent.onCloseCall()` →
  `activeCallData` going `null` → `CallComponent` being destroyed by the
  `@if` block → its own `ngOnDestroy` removing the `visibilitychange`
  listener — already tears everything down correctly. `close()` on the
  PiP service still needs calling explicitly in that path too (component
  destruction doesn't imply the floating window closes itself), so
  `ngOnDestroy` also calls `this.pip.close()` unconditionally (idempotent,
  see above).

## Files touched

- `packages/web/src/app/pages/call/wellcome/call.component.ts` —
  `DragDropModule` import; `visibilitychange` listener add/remove;
  `PictureInPictureService` injection and wiring in `ngOnDestroy`.
- `packages/web/src/app/pages/call/wellcome/call.component.html` —
  `cdkDrag`/`cdkDragBoundary` on `.call-window`, `cdkDragHandle` on
  `#room-header`.
- New: `packages/web/src/app/pages/live-kit/picture-in-picture.service.ts`.
- New: `packages/web/src/app/pages/live-kit/picture-in-picture.service.spec.ts`.

## Testing

- `PictureInPictureService`: unit-testable in isolation with
  `documentPictureInPicture` mocked on `window`.
  - `isSupported` reflects presence/absence of the global.
  - `open()` no-ops (no window requested) when unsupported.
  - `open()` no-ops when already active (no second window requested).
  - `open()` calls `.attach()` on both provided tracks with the created
    video elements.
  - `close()` calls `.detach()` on both tracks and closes the window;
    calling `close()` twice in a row doesn't throw.
  - The mic button's click handler calls `onToggleMic()`.
  - The leave button's click handler calls `onLeave()`.
- `cdkDrag`/`cdkDragHandle`: no meaningful unit-test surface (CDK's own
  drag mechanics are tested upstream) — manual verification: drag from
  the header moves the window and stays within the viewport; dragging
  from the video area or clicking header buttons does not initiate a
  drag.
- Manual verification for the PiP flow (Chrome/Edge only, real browser
  API — not mockable end-to-end in Karma/headless): start a call, switch
  tabs, confirm the floating window appears with working video and
  controls; switch back, confirm it closes and the in-page overlay is
  unaffected; close the floating window directly, confirm state is
  consistent.

## Out of Scope

- Full call UI (screen share toggle, fullscreen, participant list) in the
  floating window — glance-view only, per the approved design (mic +
  leave).
- Persisting the dragged window's position across calls (resets to the
  default top-right position on the next call) — not requested.
- Any behavior for browsers without Document Picture-in-Picture beyond
  the plain no-op fallback (e.g. no alternate "always-on-top" mechanism
  for Firefox/Safari) — matches the approved design.
