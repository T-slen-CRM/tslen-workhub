# LiveKit Draggable Call Window + Cross-Tab PiP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The call window can be dragged anywhere in the viewport, and when the user switches away from the app's browser tab during an active call, a small floating cross-tab window (Chrome/Edge 116+, via the Document Picture-in-Picture API) automatically shows a glance-view (main video, self-view, mic toggle, leave) — with a plain no-op fallback in browsers that don't support it.

**Architecture:** Dragging reuses Angular CDK's `cdkDrag`/`cdkDragHandle`/`cdkDragBoundary` directives (already a dependency, already used elsewhere in this codebase) applied directly to `call.component.html` — no new code beyond template attributes and an import. The cross-tab window is owned entirely by a new single-responsibility `PictureInPictureService`, which `CallComponent` calls into from a `document.visibilitychange` listener; the service builds the floating window's DOM by hand (Angular rendering can't span two `Document` objects) and attaches the *same* live LiveKit tracks to new `<video>` elements inside it — the in-page overlay keeps running unaffected the whole time.

**Tech Stack:** Angular 20 (standalone components, signals), Angular CDK drag-drop, `livekit-client`'s `Track.attach`/`detach`, the browser's Document Picture-in-Picture API (`window.documentPictureInPicture`), Karma/Jasmine.

**Spec:** `docs/superpowers/specs/2026-08-21-livekit-draggable-and-cross-tab-pip-design.md`

## Global Constraints

- No new npm dependency — `@angular/cdk` is already installed and `cdkDrag` is already used elsewhere in this codebase (`tasks-list.component.html`, `task-phase-sort.component.html`); follow that same pattern.
- The floating cross-tab window is Chrome/Edge 116+ only. `PictureInPictureService.open()` must be a safe no-op (never throws, never leaves partial state) in every other browser and in every failure case (including `requestWindow()` rejecting, e.g. if user-activation is required and tab-switching doesn't count — see the spec's "Known risk" section).
- The floating window is a **glance-view only**: main video, self-view, mic toggle, leave button. No screen share, camera toggle, fullscreen, or participant list in it — those stay in the main in-page overlay.
- Tracks are never moved out of the main overlay's own `<video>` elements — the service attaches the *same* track to *additional* `<video>` elements it creates itself. The main overlay must keep working normally while the floating window is open.
- Follow this repo's commit convention: Conventional Commits, no ticket prefix, no `Co-Authored-By: Claude` trailer (see `AGENTS.md`).
- Every new piece of behavior needs a test that would have failed before the change (see `AGENTS.md`'s testing section) — TDD red/green, following the existing pattern in `live-kitWebSocket.service.spec.ts` (mock dependencies with `jasmine.createSpyObj`/plain objects, not real providers).

---

## Task 1: Draggable call window

**Files:**
- Modify: `packages/web/src/app/pages/call/wellcome/call.component.ts`
- Modify: `packages/web/src/app/pages/call/wellcome/call.component.html`

**Interfaces:**
- None (template + import only, no new methods/state).

- [ ] **Step 1: Import `DragDropModule` into `CallComponent`**

In `packages/web/src/app/pages/call/wellcome/call.component.ts`, add the import near the other Angular Material imports:

```typescript
import { DragDropModule } from '@angular/cdk/drag-drop';
```

Add `DragDropModule` to the component's `imports` array:

```typescript
    imports: [
        ReactiveFormsModule,
        VideoComponent,
        AudioComponent,
        NgClass,
        MatButtonModule,
        TranslateModule,
        DragDropModule
    ],
```

- [ ] **Step 2: Make `.call-window` draggable via its header**

In `packages/web/src/app/pages/call/wellcome/call.component.html`, change:

```html
<div class="call-window" id="room"
     [ngClass]="{ 'call-small': minimized, 'call-fullscreen': !minimized }">
```

to:

```html
<div class="call-window" id="room"
     cdkDrag
     cdkDragBoundary="body"
     [ngClass]="{ 'call-small': minimized, 'call-fullscreen': !minimized }">
```

And change:

```html
    <div id="room-header" [class.hidden]="isFullscreen()">
```

to:

```html
    <div id="room-header" cdkDragHandle [class.hidden]="isFullscreen()">
```

- [ ] **Step 3: Verify the frontend builds**

Run: `cd packages/web && npx ng build --configuration production`
Expected: build succeeds with no errors (this is the same command the Dockerfile runs, so a clean run here means the Docker image will build correctly too).

- [ ] **Step 4: Manual verification**

Run the app (`npm run start:dev` from repo root, `cd packages/web && npm start` for the frontend), start or join a call, and confirm in the browser:
- Clicking and dragging the room-header area (where the room link and camera/screen-share/mic/expand buttons are) moves the whole call window.
- Clicking any of those header buttons still triggers their normal action (camera toggle, etc.) rather than being swallowed by the drag handle.
- Clicking and dragging the video area itself (not the header) does *not* move the window.
- The window can't be dragged outside the browser viewport.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/pages/call/wellcome/call.component.ts packages/web/src/app/pages/call/wellcome/call.component.html
git commit -m "feat(live-kit): make the call window draggable via its header"
```

---

## Task 2: `PictureInPictureService`

**Files:**
- Create: `packages/web/src/app/pages/live-kit/picture-in-picture.service.ts`
- Create: `packages/web/src/app/pages/live-kit/picture-in-picture.service.spec.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface PictureInPictureHandles {
    getMainVideoTrack: () => VideoTrack | null;
    getSelfVideoTrack: () => VideoTrack | null;
    isMicEnabled: () => boolean;
    onToggleMic: () => void;
    onLeave: () => void;
  }

  export class PictureInPictureService {
    readonly isSupported: boolean;
    isActive(): boolean;
    async open(handles: PictureInPictureHandles): Promise<void>;
    close(): void;
  }
  ```
  `VideoTrack` is `livekit-client`'s exported union type (`RemoteVideoTrack | LocalVideoTrack`), already imported elsewhere in this codebase (e.g. `call.component.ts`). Consumed by Task 3.

- [ ] **Step 1: Write the failing tests**

Create `packages/web/src/app/pages/live-kit/picture-in-picture.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { PictureInPictureService, PictureInPictureHandles } from './picture-in-picture.service';

describe('PictureInPictureService', () => {
  let handles: PictureInPictureHandles;
  let mainTrack: { attach: jasmine.Spy; detach: jasmine.Spy };
  let selfTrack: { attach: jasmine.Spy; detach: jasmine.Spy };
  let originalDocumentPip: any;

  function createFakePipWindow() {
    const listeners: Record<string, () => void> = {};
    return {
      document: document.implementation.createHTMLDocument('pip'),
      closed: false,
      close: jasmine.createSpy('close'),
      addEventListener: (event: string, cb: () => void) => { listeners[event] = cb; },
      __fireListener: (event: string) => listeners[event]?.(),
    };
  }

  beforeEach(() => {
    originalDocumentPip = (window as any).documentPictureInPicture;

    mainTrack = jasmine.createSpyObj('mainTrack', ['attach', 'detach']);
    selfTrack = jasmine.createSpyObj('selfTrack', ['attach', 'detach']);
    handles = {
      getMainVideoTrack: () => mainTrack as any,
      getSelfVideoTrack: () => selfTrack as any,
      isMicEnabled: () => true,
      onToggleMic: jasmine.createSpy('onToggleMic'),
      onLeave: jasmine.createSpy('onLeave'),
    };
  });

  afterEach(() => {
    (window as any).documentPictureInPicture = originalDocumentPip;
  });

  describe('when documentPictureInPicture is unsupported', () => {
    let service: PictureInPictureService;

    beforeEach(() => {
      delete (window as any).documentPictureInPicture;
      TestBed.configureTestingModule({ providers: [PictureInPictureService] });
      service = TestBed.inject(PictureInPictureService);
    });

    it('reports isSupported as false', () => {
      expect(service.isSupported).toBeFalse();
    });

    it('open() does not become active', async () => {
      await service.open(handles);
      expect(service.isActive()).toBeFalse();
    });
  });

  describe('when documentPictureInPicture is supported', () => {
    let service: PictureInPictureService;
    let fakePipWindow: ReturnType<typeof createFakePipWindow>;
    let requestWindowSpy: jasmine.Spy;

    beforeEach(() => {
      fakePipWindow = createFakePipWindow();
      requestWindowSpy = jasmine.createSpy('requestWindow').and.resolveTo(fakePipWindow);
      (window as any).documentPictureInPicture = { requestWindow: requestWindowSpy };

      TestBed.configureTestingModule({ providers: [PictureInPictureService] });
      service = TestBed.inject(PictureInPictureService);
    });

    it('reports isSupported as true', () => {
      expect(service.isSupported).toBeTrue();
    });

    it('attaches the main and self tracks to new video elements in the PiP window', async () => {
      await service.open(handles);

      expect(mainTrack.attach).toHaveBeenCalledWith(jasmine.any(HTMLVideoElement));
      expect(selfTrack.attach).toHaveBeenCalledWith(jasmine.any(HTMLVideoElement));
      expect(service.isActive()).toBeTrue();
    });

    it('does not request a second window if already active', async () => {
      await service.open(handles);
      await service.open(handles);

      expect(requestWindowSpy).toHaveBeenCalledTimes(1);
    });

    it('close() detaches both tracks and closes the window', async () => {
      await service.open(handles);

      service.close();

      expect(mainTrack.detach).toHaveBeenCalledWith(jasmine.any(HTMLVideoElement));
      expect(selfTrack.detach).toHaveBeenCalledWith(jasmine.any(HTMLVideoElement));
      expect(fakePipWindow.close).toHaveBeenCalled();
      expect(service.isActive()).toBeFalse();
    });

    it('close() is a no-op when not active', () => {
      expect(() => service.close()).not.toThrow();
    });

    it('closes automatically when the PiP window fires pagehide', async () => {
      await service.open(handles);

      fakePipWindow.__fireListener('pagehide');

      expect(service.isActive()).toBeFalse();
    });

    it('the mic button click calls onToggleMic', async () => {
      await service.open(handles);
      const micButton = fakePipWindow.document.querySelectorAll('button')[0] as HTMLButtonElement;

      micButton.click();

      expect(handles.onToggleMic).toHaveBeenCalled();
    });

    it('the leave button click calls onLeave', async () => {
      await service.open(handles);
      const leaveButton = fakePipWindow.document.querySelectorAll('button')[1] as HTMLButtonElement;

      leaveButton.click();

      expect(handles.onLeave).toHaveBeenCalled();
    });

    it('falls back to inactive when requestWindow rejects (e.g. no user activation)', async () => {
      requestWindowSpy.and.rejectWith(new Error('NotAllowedError'));

      await service.open(handles);

      expect(service.isActive()).toBeFalse();
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd packages/web && npx ng test --include='**/picture-in-picture.service.spec.ts'` (or the project's headless one-off pattern from `AGENTS.md` if an interactive Chrome window isn't wanted)
Expected: FAIL — `picture-in-picture.service.ts` doesn't exist yet (module not found / compile error).

- [ ] **Step 3: Write the implementation**

Create `packages/web/src/app/pages/live-kit/picture-in-picture.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { VideoTrack } from 'livekit-client';

export interface PictureInPictureHandles {
  getMainVideoTrack: () => VideoTrack | null;
  getSelfVideoTrack: () => VideoTrack | null;
  isMicEnabled: () => boolean;
  onToggleMic: () => void;
  onLeave: () => void;
}

@Injectable({ providedIn: 'root' })
export class PictureInPictureService {
  readonly isSupported: boolean = typeof (window as any).documentPictureInPicture !== 'undefined';

  private pipWindow?: Window;
  private mainVideoEl?: HTMLVideoElement;
  private selfVideoEl?: HTMLVideoElement;
  private handles?: PictureInPictureHandles;

  isActive(): boolean {
    return !!this.pipWindow;
  }

  async open(handles: PictureInPictureHandles): Promise<void> {
    if (!this.isSupported || this.isActive()) {
      return;
    }

    let pipWindow: Window;
    try {
      pipWindow = await (window as any).documentPictureInPicture.requestWindow({ width: 300, height: 220 });
    } catch {
      // Browser declined to open the window for any reason (no user
      // activation, feature disabled, etc.) - fall back to no PiP.
      return;
    }

    this.pipWindow = pipWindow;
    this.handles = handles;
    this.buildContent(pipWindow, handles);
    pipWindow.addEventListener('pagehide', () => this.close());
  }

  close(): void {
    if (!this.pipWindow) {
      return;
    }
    const mainTrack = this.handles?.getMainVideoTrack();
    const selfTrack = this.handles?.getSelfVideoTrack();
    if (mainTrack && this.mainVideoEl) {
      mainTrack.detach(this.mainVideoEl);
    }
    if (selfTrack && this.selfVideoEl) {
      selfTrack.detach(this.selfVideoEl);
    }
    if (!this.pipWindow.closed) {
      this.pipWindow.close();
    }
    this.pipWindow = undefined;
    this.mainVideoEl = undefined;
    this.selfVideoEl = undefined;
    this.handles = undefined;
  }

  private buildContent(pipWindow: Window, handles: PictureInPictureHandles): void {
    const doc = pipWindow.document;
    doc.body.style.margin = '0';
    doc.body.style.background = '#121212';
    doc.body.style.position = 'relative';
    doc.body.style.overflow = 'hidden';

    this.mainVideoEl = doc.createElement('video');
    this.mainVideoEl.autoplay = true;
    this.mainVideoEl.style.width = '100%';
    this.mainVideoEl.style.height = '100%';
    this.mainVideoEl.style.objectFit = 'cover';
    doc.body.appendChild(this.mainVideoEl);
    handles.getMainVideoTrack()?.attach(this.mainVideoEl);

    this.selfVideoEl = doc.createElement('video');
    this.selfVideoEl.autoplay = true;
    this.selfVideoEl.muted = true;
    this.selfVideoEl.style.position = 'absolute';
    this.selfVideoEl.style.bottom = '8px';
    this.selfVideoEl.style.right = '8px';
    this.selfVideoEl.style.width = '80px';
    this.selfVideoEl.style.height = '60px';
    this.selfVideoEl.style.objectFit = 'cover';
    this.selfVideoEl.style.borderRadius = '4px';
    doc.body.appendChild(this.selfVideoEl);
    handles.getSelfVideoTrack()?.attach(this.selfVideoEl);

    const controls = doc.createElement('div');
    controls.style.position = 'absolute';
    controls.style.bottom = '8px';
    controls.style.left = '8px';
    controls.style.display = 'flex';
    controls.style.gap = '8px';
    doc.body.appendChild(controls);

    const micButton = doc.createElement('button');
    const renderMicLabel = () => { micButton.textContent = handles.isMicEnabled() ? '🎤' : '🔇'; };
    renderMicLabel();
    micButton.addEventListener('click', () => {
      handles.onToggleMic();
      renderMicLabel();
    });
    controls.appendChild(micButton);

    const leaveButton = doc.createElement('button');
    leaveButton.textContent = '☎';
    leaveButton.addEventListener('click', () => handles.onLeave());
    controls.appendChild(leaveButton);
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd packages/web && npx ng test --include='**/picture-in-picture.service.spec.ts'`
Expected: PASS, all cases green.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/pages/live-kit/picture-in-picture.service.ts packages/web/src/app/pages/live-kit/picture-in-picture.service.spec.ts
git commit -m "feat(live-kit): add PictureInPictureService for the cross-tab floating call window"
```

---

## Task 3: Wire `PictureInPictureService` into `CallComponent`

**Files:**
- Modify: `packages/web/src/app/pages/call/wellcome/call.component.ts`

**Interfaces:**
- Consumes: `PictureInPictureService` (Task 2) — `isSupported`, `isActive()`, `open(handles)`, `close()`.
- Consumes existing `CallComponent` members: `room` (signal), `getCurrentMainVideoTrack()`, `localCameraTrack` (signal), `microphoneEnabled` (signal), `setMicrophoneEnabled(value)`, `leaveRoom()`.

- [ ] **Step 1: Inject the service**

In `packages/web/src/app/pages/call/wellcome/call.component.ts`, add the import:

```typescript
import { PictureInPictureService } from '../../live-kit/picture-in-picture.service';
```

Change the constructor from:

```typescript
  constructor(private auth: AuthenticationService,
              private dataService: DataService, private router: Router) {
    this.configureUrls();
  }
```

to:

```typescript
  constructor(private auth: AuthenticationService,
              private dataService: DataService, private router: Router,
              private pip: PictureInPictureService) {
    this.configureUrls();
  }
```

- [ ] **Step 2: Add the visibilitychange handler and register/unregister it**

Add this class field near the other private fields (e.g. right after `private destroyed = false;`):

```typescript
  private onVisibilityChange = () => {
    if (document.visibilityState === 'hidden' && this.room()) {
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

At the end of `ngOnInit()` (after the existing `this.setMicrophoneEnabled(true);` line), add:

```typescript
    document.addEventListener('visibilitychange', this.onVisibilityChange);
```

In `ngOnDestroy()`, change:

```typescript
  async ngOnDestroy(event?: Event) {
    this.destroyed = true;
    // On window closed or component destroyed, leave the room
    await this.leaveRoom();
  }
```

to:

```typescript
  async ngOnDestroy(event?: Event) {
    this.destroyed = true;
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.pip.close();
    // On window closed or component destroyed, leave the room
    await this.leaveRoom();
  }
```

- [ ] **Step 3: Verify the frontend builds**

Run: `cd packages/web && npx ng build --configuration production`
Expected: build succeeds with no errors.

- [ ] **Step 4: Run the full frontend LiveKit test set to check for regressions**

Run: `cd packages/web && npx ng test --include='**/call.component.spec.ts' --include='**/picture-in-picture.service.spec.ts' --include='**/live-kitWebSocket.service.spec.ts' --include='**/buttonRender.component.spec.ts'`
Expected: PASS, no regressions in `call.component.spec.ts`'s existing guard test.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/pages/call/wellcome/call.component.ts
git commit -m "feat(live-kit): open the cross-tab PiP window on tab switch during a call"
```

---

## Task 4: Manual end-to-end verification

**Files:** None — verification only.

**Interfaces:** None.

- [ ] **Step 1: Verify the automatic cross-tab flow in Chrome or Edge (116+)**

Start the app (`npm run start:dev` + `cd packages/web && npm start`, or the Docker Compose quickstart), join or accept a call, then switch to a different browser tab.

Expected:
- A small floating window (~300×220) appears showing the main video, a small self-view in the corner, and two buttons (mic, leave).
- The main in-page call window (in the original tab) is still running normally underneath — switching back to that tab, the call hasn't dropped.
- Clicking the mic button in the floating window toggles the microphone (its icon updates, and the change is reflected back in the main tab's own mic button state when you switch back).
- Clicking the leave button in the floating window ends the call (both the floating window and the main tab's overlay close).
- Switching back to the app's tab (without using the leave button) closes the floating window and the call keeps running in-page as normal.
- Closing the floating window directly (its own window-chrome close button) doesn't break anything — the main tab's call state stays consistent (check the console for errors, and that a subsequent tab-switch can open the floating window again for the same call).

- [ ] **Step 2: Verify the fallback in an unsupported browser (Firefox or Safari), if available**

Same call flow, switch tabs. Expected: no floating window appears, no console errors, and the call keeps working normally — this is the entire fallback story, so confirm there's no broken UI or thrown exception from the unsupported path.

- [ ] **Step 3: Report findings**

If either check reveals the "Known risk" from the spec (e.g. `requestWindow()` rejecting even during a real user-triggered tab switch), report that back rather than silently reworking the trigger — the spec's stated position is that a manual "pop out" button fallback is explicitly out of scope for this pass unless this verification shows it's needed.
