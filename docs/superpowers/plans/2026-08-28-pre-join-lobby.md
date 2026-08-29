# Pre-Join Lobby Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Before a host or guest lands in a live LiveKit call, they pass through a lobby that previews camera/mic, lets them toggle each on/off with a live audio level meter, and lets them enable background blur — with whatever state they leave the lobby in being exactly what they join the call with.

**Architecture:** A new shared standalone `PreJoinLobbyComponent` (`packages/web/src/app/meeting-room/pre-join-lobby/`) acquires real `LocalVideoTrack`/`LocalAudioTrack` preview tracks via `livekit-client`'s `createLocalVideoTrack`/`createLocalAudioTrack` (no `Room` needed yet), drives a level meter off `livekit-client`'s own `createAudioAnalyser` helper, and applies blur via `@livekit/track-processors`' `BackgroundProcessor`. It hands the live tracks it ends up with to `MeetingRoomComponent` via a `joined` output, which `MeetingRoomComponent` now publishes directly (`room.localParticipant.publishTrack(...)`) instead of unconditionally calling `setCameraEnabled(true)`/`setMicrophoneEnabled(true)`. Both `GuestMeetingLandingComponent` (guest flow) and `MeetingLinksManagerComponent` (host's own-meeting flow) gain a lobby step ahead of their existing token-minting call, which now fires only after the lobby hands off.

**Tech Stack:** Angular 22 standalone components + signals (frontend only, no backend changes), `livekit-client` (already a dependency), `@livekit/track-processors` (new dependency), Jest + jest-preset-angular with this repo's Jasmine-compat spy layer (`spyOn`, `jasmine.createSpy`, `.and.resolveTo`/`.and.returnValue`).

**Spec:** `docs/superpowers/specs/2026-08-28-pre-join-lobby-design.md`

## Global Constraints

- This is a `packages/web/`-only change — no backend code, no new REST endpoints. Run all commands from `packages/web/` unless noted.
- Conventional Commits, no Jira prefix, no `Co-Authored-By: Claude` trailer (this repo's `AGENTS.md`). Every commit in this plan appends the footer `Task: https://tslen.ds.bidscube.com/pages/tasks-list/10;title=T-slen%2520Workhub;task=417` (this repo's task-linking convention, not Jira).
- New Angular inputs use signal `input()`, never `@Input()`.
- Frontend specs are written against Jasmine's API (`spyOn`, `jasmine.createSpy`, `.and.resolveTo`/`.and.returnValue`, `.calls.mostRecent()`) per `src/test-setup/jasmine-compat.ts` — never raw `jest.fn()`/`jest.spyOn()` directly in spec bodies.
- A device or blur failure must never block "Join meeting" — every toggle degrades independently (see spec §3).
- No camera/mic is ever force-enabled by `MeetingRoomComponent` — it only publishes what the lobby handed it.

---

## Task 1: `PreJoinLobbyComponent` — camera & mic preview with toggles and permission handling

**Files:**
- Create: `packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.ts`
- Create: `packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.html`
- Create: `packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.css`
- Create: `packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.spec.ts`
- Modify: `packages/web/src/assets/i18n/en.json`

**Interfaces:**
- Consumes: `createLocalVideoTrack`, `createLocalAudioTrack` (both `livekit-client`, already a dependency). `VideoComponent` (`packages/web/src/app/pages/call/video/video.component.ts`, selector `video-component`, inputs `track`, `participantIdentity`, `local`, `isPreview`) — reused unmodified for the camera preview tile.
- Produces: `PreJoinLobbyComponent` — input `displayName = input.required<string>()`; readable state signals `videoTrack: Signal<LocalVideoTrack | undefined>`, `audioTrack: Signal<LocalAudioTrack | undefined>`, `cameraEnabled: Signal<boolean>`, `microphoneEnabled: Signal<boolean>`, `cameraError: Signal<boolean>`, `microphoneError: Signal<boolean>`; methods `setCameraEnabled(value: boolean): Promise<void>`, `setMicrophoneEnabled(value: boolean): Promise<void>`. (The `joined` output and `PreJoinResult` type are added in Task 5; the level meter in Task 2; blur in Task 3; persistence in Task 4 — this task is camera/mic acquisition and toggling only.)

- [ ] **Step 1: Write the failing test**

```typescript
// packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import * as livekitClient from 'livekit-client';
import { PreJoinLobbyComponent } from './pre-join-lobby.component';

describe('PreJoinLobbyComponent', () => {
  let component: PreJoinLobbyComponent;
  let fixture: ComponentFixture<PreJoinLobbyComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PreJoinLobbyComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(PreJoinLobbyComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('displayName', 'Ada');
  });

  it('acquires camera and mic preview tracks on init', async () => {
    const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
    const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
    spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
    spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);

    await component.ngOnInit();

    expect(component.videoTrack()).toBe(fakeVideoTrack);
    expect(component.audioTrack()).toBe(fakeAudioTrack);
    expect(component.cameraEnabled()).toBe(true);
    expect(component.microphoneEnabled()).toBe(true);
  });

  it('turning the camera off stops and clears the video track', async () => {
    const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
    spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
    spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
    await component.ngOnInit();

    await component.setCameraEnabled(false);

    expect(fakeVideoTrack.stop).toHaveBeenCalled();
    expect(component.videoTrack()).toBeUndefined();
    expect(component.cameraEnabled()).toBe(false);
  });

  it('turning the camera back on re-acquires a fresh track', async () => {
    spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
    const first = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
    const second = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
    const createSpy = spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(first);
    await component.ngOnInit();
    await component.setCameraEnabled(false);

    createSpy.and.resolveTo(second);
    await component.setCameraEnabled(true);

    expect(component.videoTrack()).toBe(second);
    expect(component.cameraEnabled()).toBe(true);
  });

  it('a camera permission failure disables only the camera toggle, not the mic', async () => {
    spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('Permission denied'));
    const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
    spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);

    await component.ngOnInit();

    expect(component.cameraEnabled()).toBe(false);
    expect(component.cameraError()).toBe(true);
    expect(component.microphoneEnabled()).toBe(true);
    expect(component.microphoneError()).toBe(false);
  });

  it('a microphone permission failure disables only the mic toggle, not the camera', async () => {
    const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
    spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
    spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('Permission denied'));

    await component.ngOnInit();

    expect(component.microphoneEnabled()).toBe(false);
    expect(component.microphoneError()).toBe(true);
    expect(component.cameraEnabled()).toBe(true);
    expect(component.cameraError()).toBe(false);
  });

  it('turning the mic off stops and clears the audio track', async () => {
    spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('no camera in this test'));
    const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
    spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);
    await component.ngOnInit();

    await component.setMicrophoneEnabled(false);

    expect(fakeAudioTrack.stop).toHaveBeenCalled();
    expect(component.audioTrack()).toBeUndefined();
    expect(component.microphoneEnabled()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `packages/web/`): `npm test -- pre-join-lobby.component.spec.ts`
Expected: FAIL — `Cannot find module './pre-join-lobby.component'`

- [ ] **Step 3: Write the component**

```typescript
// packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.ts
import { Component, OnInit, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LocalAudioTrack, LocalVideoTrack, createLocalAudioTrack, createLocalVideoTrack } from 'livekit-client';
import { VideoComponent } from '../../pages/call/video/video.component';

@Component({
  selector: 'app-pre-join-lobby',
  standalone: true,
  imports: [TranslateModule, VideoComponent],
  templateUrl: './pre-join-lobby.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './pre-join-lobby.component.css',
})
export class PreJoinLobbyComponent implements OnInit {
  displayName = input.required<string>();

  videoTrack = signal<LocalVideoTrack | undefined>(undefined);
  audioTrack = signal<LocalAudioTrack | undefined>(undefined);
  cameraEnabled = signal(false);
  microphoneEnabled = signal(false);
  cameraError = signal(false);
  microphoneError = signal(false);

  async ngOnInit(): Promise<void> {
    await Promise.allSettled([
      this.startCamera(),
      this.startMicrophone(),
    ]);
  }

  async setCameraEnabled(value: boolean): Promise<void> {
    if (value) {
      await this.startCamera();
    } else {
      this.videoTrack()?.stop();
      this.videoTrack.set(undefined);
      this.cameraEnabled.set(false);
    }
  }

  async setMicrophoneEnabled(value: boolean): Promise<void> {
    if (value) {
      await this.startMicrophone();
    } else {
      this.audioTrack()?.stop();
      this.audioTrack.set(undefined);
      this.microphoneEnabled.set(false);
    }
  }

  private async startCamera(): Promise<void> {
    try {
      const track = await createLocalVideoTrack();
      this.videoTrack.set(track);
      this.cameraEnabled.set(true);
      this.cameraError.set(false);
    } catch {
      this.cameraEnabled.set(false);
      this.cameraError.set(true);
    }
  }

  private async startMicrophone(): Promise<void> {
    try {
      const track = await createLocalAudioTrack();
      this.audioTrack.set(track);
      this.microphoneEnabled.set(true);
      this.microphoneError.set(false);
    } catch {
      this.microphoneEnabled.set(false);
      this.microphoneError.set(true);
    }
  }
}
```

- [ ] **Step 4: Write the template**

```html
<!-- packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.html -->
<div class="pre-join-lobby">
  <h2>{{ 'pre_join_lobby.title' | translate }}</h2>

  <div class="pre-join-preview">
    @if (videoTrack()) {
      <video-component
        [track]="videoTrack()!"
        [participantIdentity]="displayName()"
        [local]="true"
        [isPreview]="true"
      ></video-component>
    } @else {
      <div class="pre-join-preview-placeholder">
        <i class="fas fa-video-slash"></i>
      </div>
    }
  </div>

  <div class="pre-join-controls">
    <div class="pre-join-control">
      <button
        type="button"
        class="btn btn-sm"
        [ngClass]="cameraEnabled() ? 'btn-success' : 'btn-danger'"
        (click)="setCameraEnabled(!cameraEnabled())"
      >
        <i class="fas" [ngClass]="cameraEnabled() ? 'fa-video' : 'fa-video-slash'"></i>
      </button>
      @if (cameraError()) {
        <span class="pre-join-error">{{ 'pre_join_lobby.camera_unavailable' | translate }}</span>
      }
    </div>

    <div class="pre-join-control">
      <button
        type="button"
        class="btn btn-sm"
        [ngClass]="microphoneEnabled() ? 'btn-success' : 'btn-danger'"
        (click)="setMicrophoneEnabled(!microphoneEnabled())"
      >
        <i class="fas" [ngClass]="microphoneEnabled() ? 'fa-microphone' : 'fa-microphone-slash'"></i>
      </button>
      @if (microphoneError()) {
        <span class="pre-join-error">{{ 'pre_join_lobby.microphone_unavailable' | translate }}</span>
      }
    </div>
  </div>
</div>
```

- [ ] **Step 5: Add a minimal stylesheet**

```css
/* packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.css */
.pre-join-lobby {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
}
.pre-join-preview {
  width: 480px;
  max-width: 90vw;
  aspect-ratio: 16 / 9;
  background: #1b1b1f;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pre-join-preview-placeholder {
  color: #888;
  font-size: 2.5rem;
}
.pre-join-controls {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.pre-join-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.pre-join-error {
  font-size: 0.75rem;
  color: #d9534f;
  max-width: 140px;
  text-align: center;
}
```

- [ ] **Step 6: Add translation keys**

In `packages/web/src/assets/i18n/en.json`, add a new top-level `pre_join_lobby` key immediately after the `"meeting_room": { ... },` block closes and before `"guest_meeting": {` begins (mirroring the existing `guest_meeting`/`meeting_links` sections — this repo only adds new-feature keys to `en.json`, not `ru`/`uk`/`fr`/`es`, per the existing `guest_meeting` precedent):

```json
  "pre_join_lobby": {
    "title": "Check your camera and microphone",
    "camera_unavailable": "Camera unavailable",
    "microphone_unavailable": "Microphone unavailable"
  },
```

- [ ] **Step 7: Run test to verify it passes**

Run (from `packages/web/`): `npm test -- pre-join-lobby.component.spec.ts`
Expected: PASS (6 tests)

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/app/meeting-room/pre-join-lobby packages/web/src/assets/i18n/en.json
git commit -m "$(cat <<'EOF'
feat(meeting-links): add pre-join lobby camera/mic preview

Task: https://tslen.ds.bidscube.com/pages/tasks-list/10;title=T-slen%2520Workhub;task=417
EOF
)"
```

---

## Task 2: Live audio level meter

**Files:**
- Modify: `packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.ts`
- Modify: `packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.html`
- Modify: `packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.css`
- Modify: `packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.spec.ts`

**Interfaces:**
- Consumes: `createAudioAnalyser` (`livekit-client`) — `createAudioAnalyser(track): { calculateVolume: () => number; analyser: AnalyserNode; cleanup: () => Promise<void> }`.
- Produces: adds `audioLevel: Signal<number>` (0–1) to `PreJoinLobbyComponent`, driven while the mic is on.

- [ ] **Step 1: Write the failing test**

Add to `pre-join-lobby.component.spec.ts` (new `describe` block, after the existing `it`s):

```typescript
  describe('audio level meter', () => {
    it('drives audioLevel from the analyser while the mic is on', async () => {
      spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('no camera in this test'));
      const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);
      const calculateVolume = jasmine.createSpy('calculateVolume').and.returnValue(0.42);
      const analyserCleanup = jasmine.createSpy('cleanup').and.resolveTo(undefined);
      spyOn(livekitClient, 'createAudioAnalyser').and.returnValue({ calculateVolume, analyser: {} as AnalyserNode, cleanup: analyserCleanup });
      let rafCallback: FrameRequestCallback | undefined;
      spyOn(window, 'requestAnimationFrame').and.callFake((cb: FrameRequestCallback) => {
        rafCallback = cb;
        return 1;
      });

      await component.ngOnInit();
      rafCallback!(0);

      expect(livekitClient.createAudioAnalyser).toHaveBeenCalledWith(fakeAudioTrack);
      expect(component.audioLevel()).toBe(0.42);
    });

    it('stops the analyser and resets the level when the mic is turned off', async () => {
      spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('no camera in this test'));
      const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);
      const analyserCleanup = jasmine.createSpy('cleanup').and.resolveTo(undefined);
      spyOn(livekitClient, 'createAudioAnalyser').and.returnValue({ calculateVolume: () => 0.9, analyser: {} as AnalyserNode, cleanup: analyserCleanup });
      spyOn(window, 'requestAnimationFrame').and.returnValue(1);
      spyOn(window, 'cancelAnimationFrame');
      await component.ngOnInit();

      await component.setMicrophoneEnabled(false);

      expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
      expect(analyserCleanup).toHaveBeenCalled();
      expect(component.audioLevel()).toBe(0);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `packages/web/`): `npm test -- pre-join-lobby.component.spec.ts`
Expected: FAIL — `component.audioLevel is not a function`

- [ ] **Step 3: Wire the analyser into the component**

In `pre-join-lobby.component.ts`, update the import and add the level-meter state/methods:

Replace:
```typescript
import { LocalAudioTrack, LocalVideoTrack, createLocalAudioTrack, createLocalVideoTrack } from 'livekit-client';
```
with:
```typescript
import { LocalAudioTrack, LocalVideoTrack, createAudioAnalyser, createLocalAudioTrack, createLocalVideoTrack } from 'livekit-client';
```

Add a field for the audio level and the analyser's own cleanup/frame handle, next to the existing signals:
```typescript
  audioLevel = signal(0);

  private analyserCleanup: (() => Promise<void>) | undefined;
  private levelFrame: number | undefined;
```

Replace `startMicrophone`:
```typescript
  private async startMicrophone(): Promise<void> {
    try {
      const track = await createLocalAudioTrack();
      this.audioTrack.set(track);
      this.microphoneEnabled.set(true);
      this.microphoneError.set(false);
      this.startLevelMeter(track);
    } catch {
      this.microphoneEnabled.set(false);
      this.microphoneError.set(true);
    }
  }

  private startLevelMeter (track: LocalAudioTrack): void {
    const { calculateVolume, cleanup } = createAudioAnalyser(track);
    this.analyserCleanup = cleanup;
    const tick = (): void => {
      this.audioLevel.set(calculateVolume());
      this.levelFrame = requestAnimationFrame(tick);
    };
    tick();
  }

  private stopLevelMeter (): void {
    if (this.levelFrame !== undefined) {
      cancelAnimationFrame(this.levelFrame);
      this.levelFrame = undefined;
    }
    this.analyserCleanup?.();
    this.analyserCleanup = undefined;
    this.audioLevel.set(0);
  }
```

Update `setMicrophoneEnabled`'s off-branch to stop the meter:
```typescript
  async setMicrophoneEnabled(value: boolean): Promise<void> {
    if (value) {
      await this.startMicrophone();
    } else {
      this.stopLevelMeter();
      this.audioTrack()?.stop();
      this.audioTrack.set(undefined);
      this.microphoneEnabled.set(false);
    }
  }
```

- [ ] **Step 4: Add the meter to the template**

In `pre-join-lobby.component.html`, inside the mic `.pre-join-control` div, after the mic toggle button and before the `@if (microphoneError())` block:

```html
      @if (microphoneEnabled()) {
        <div class="pre-join-level-meter">
          <div class="pre-join-level-fill" [style.width.%]="audioLevel() * 100"></div>
        </div>
      }
```

- [ ] **Step 5: Add meter styles**

Append to `pre-join-lobby.component.css`:

```css
.pre-join-level-meter {
  width: 80px;
  height: 6px;
  background: #333;
  border-radius: 3px;
  overflow: hidden;
}
.pre-join-level-fill {
  height: 100%;
  background: #28a745;
  transition: width 0.05s linear;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run (from `packages/web/`): `npm test -- pre-join-lobby.component.spec.ts`
Expected: PASS (8 tests)

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/app/meeting-room/pre-join-lobby
git commit -m "$(cat <<'EOF'
feat(meeting-links): add live audio level meter to pre-join lobby

Task: https://tslen.ds.bidscube.com/pages/tasks-list/10;title=T-slen%2520Workhub;task=417
EOF
)"
```

---

## Task 3: Background blur toggle

**Files:**
- Modify: `packages/web/package.json`
- Modify: `packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.ts`
- Modify: `packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.html`
- Modify: `packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.spec.ts`
- Modify: `packages/web/src/assets/i18n/en.json`

**Interfaces:**
- Consumes: `BackgroundProcessor` (new dependency `@livekit/track-processors`) — `BackgroundProcessor({ mode: 'background-blur', blurRadius }): BackgroundProcessorWrapper`; `LocalVideoTrack.setProcessor(processor): Promise<void>` / `.stopProcessor(): Promise<void>` (both already part of `livekit-client`'s `LocalTrack`).
- Produces: adds `blurEnabled: Signal<boolean>`, `blurUnavailable: Signal<boolean>`, and `setBlurEnabled(value: boolean): Promise<void>` to `PreJoinLobbyComponent`.

- [ ] **Step 1: Add the dependency**

In `packages/web/package.json`, add to `dependencies` (alphabetically, right after `"@kolkov/angular-editor": "^3.1.0",`):

```json
    "@livekit/track-processors": "^0.7.2",
```

and to `devDependencies` (alphabetically, right before `"@types/jest": "^30.0.0",`):

```json
    "@types/dom-mediacapture-transform": "^0.1.9",
```

Run (from `packages/web/`): `npm install`
Verify: `npm ls @livekit/track-processors` prints `@livekit/track-processors@0.7.2` with no `UNMET DEPENDENCY` warning.

- [ ] **Step 2: Write the failing test**

Add to `pre-join-lobby.component.spec.ts`: import the new module at the top —

```typescript
import * as trackProcessors from '@livekit/track-processors';
```

— and add a new `describe` block:

```typescript
  describe('background blur', () => {
    it('applies BackgroundProcessor to the video track when enabled', async () => {
      const fakeVideoTrack = {
        stop: jasmine.createSpy('stop'),
        setProcessor: jasmine.createSpy('setProcessor').and.resolveTo(undefined),
        stopProcessor: jasmine.createSpy('stopProcessor').and.resolveTo(undefined),
      } as unknown as livekitClient.LocalVideoTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      const fakeProcessor = {} as trackProcessors.BackgroundProcessorWrapper;
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue(fakeProcessor);
      await component.ngOnInit();

      await component.setBlurEnabled(true);

      expect(trackProcessors.BackgroundProcessor).toHaveBeenCalledWith({ mode: 'background-blur', blurRadius: 10 });
      expect(fakeVideoTrack.setProcessor).toHaveBeenCalledWith(fakeProcessor);
      expect(component.blurEnabled()).toBe(true);
      expect(component.blurUnavailable()).toBe(false);
    });

    it('stops the processor when blur is turned back off', async () => {
      const fakeVideoTrack = {
        stop: jasmine.createSpy('stop'),
        setProcessor: jasmine.createSpy('setProcessor').and.resolveTo(undefined),
        stopProcessor: jasmine.createSpy('stopProcessor').and.resolveTo(undefined),
      } as unknown as livekitClient.LocalVideoTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);
      await component.ngOnInit();
      await component.setBlurEnabled(true);

      await component.setBlurEnabled(false);

      expect(fakeVideoTrack.stopProcessor).toHaveBeenCalled();
      expect(component.blurEnabled()).toBe(false);
    });

    it('disables the blur toggle without blocking the lobby when the processor fails to init', async () => {
      const fakeVideoTrack = {
        stop: jasmine.createSpy('stop'),
        setProcessor: jasmine.createSpy('setProcessor').and.rejectWith(new Error('WebGL unsupported')),
        stopProcessor: jasmine.createSpy('stopProcessor').and.resolveTo(undefined),
      } as unknown as livekitClient.LocalVideoTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);
      await component.ngOnInit();

      await component.setBlurEnabled(true);

      expect(component.blurEnabled()).toBe(false);
      expect(component.blurUnavailable()).toBe(true);
    });

    it('is a no-op when there is no video track to blur', async () => {
      spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('no camera in this test'));
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      const processorSpy = spyOn(trackProcessors, 'BackgroundProcessor');
      await component.ngOnInit();

      await component.setBlurEnabled(true);

      expect(processorSpy).not.toHaveBeenCalled();
      expect(component.blurEnabled()).toBe(false);
    });
  });
```

- [ ] **Step 3: Run test to verify it fails**

Run (from `packages/web/`): `npm test -- pre-join-lobby.component.spec.ts`
Expected: FAIL — `component.setBlurEnabled is not a function`

- [ ] **Step 4: Implement the blur toggle**

In `pre-join-lobby.component.ts`, add the import:

```typescript
import { BackgroundProcessor, BackgroundProcessorWrapper } from '@livekit/track-processors';
```

Add signals next to `audioLevel`:

```typescript
  blurEnabled = signal(false);
  blurUnavailable = signal(false);

  private processor: BackgroundProcessorWrapper | undefined;
```

Add the method (anywhere among the other public methods):

```typescript
  async setBlurEnabled (value: boolean): Promise<void> {
    const track = this.videoTrack();
    if (!track) {
      return;
    }
    if (value) {
      try {
        this.processor = BackgroundProcessor({ mode: 'background-blur', blurRadius: 10 });
        await track.setProcessor(this.processor);
        this.blurEnabled.set(true);
        this.blurUnavailable.set(false);
      } catch {
        this.processor = undefined;
        this.blurEnabled.set(false);
        this.blurUnavailable.set(true);
      }
    } else {
      await track.stopProcessor();
      this.processor = undefined;
      this.blurEnabled.set(false);
    }
  }
```

- [ ] **Step 5: Add the toggle to the template**

In `pre-join-lobby.component.html`, add a third `.pre-join-control` after the mic one, before the closing `</div>` of `.pre-join-controls`:

```html
    <div class="pre-join-control">
      <button
        type="button"
        class="btn btn-sm"
        [disabled]="!videoTrack() || blurUnavailable()"
        [ngClass]="blurEnabled() ? 'btn-success' : 'btn-secondary'"
        (click)="setBlurEnabled(!blurEnabled())"
      >
        {{ 'pre_join_lobby.blur' | translate }}
      </button>
      @if (blurUnavailable()) {
        <span class="pre-join-error">{{ 'pre_join_lobby.blur_unavailable' | translate }}</span>
      }
    </div>
```

- [ ] **Step 6: Add translation keys**

In `packages/web/src/assets/i18n/en.json`, replace the `pre_join_lobby` block Task 1 added (same location, between `meeting_room` and `guest_meeting`) with:

```json
  "pre_join_lobby": {
    "title": "Check your camera and microphone",
    "camera_unavailable": "Camera unavailable",
    "microphone_unavailable": "Microphone unavailable",
    "blur": "Blur background",
    "blur_unavailable": "Background blur isn't supported in this browser"
  },
```

- [ ] **Step 7: Run test to verify it passes**

Run (from `packages/web/`): `npm test -- pre-join-lobby.component.spec.ts`
Expected: PASS (12 tests)

- [ ] **Step 8: Commit**

```bash
git add packages/web/package.json packages/web/package-lock.json packages/web/src/app/meeting-room/pre-join-lobby packages/web/src/assets/i18n/en.json
git commit -m "$(cat <<'EOF'
feat(meeting-links): add background blur toggle to pre-join lobby

Task: https://tslen.ds.bidscube.com/pages/tasks-list/10;title=T-slen%2520Workhub;task=417
EOF
)"
```

---

## Task 4: Persist last-used camera/mic/blur choice in `localStorage`

**Files:**
- Modify: `packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.ts`
- Modify: `packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.spec.ts`

**Interfaces:**
- No new public members — `ngOnInit` now reads a stored preference to decide whether to acquire camera/mic/blur at all, and every toggle writes the current choice back.

- [ ] **Step 1: Write the failing test**

Add to `pre-join-lobby.component.spec.ts`:

```typescript
  describe('preference persistence', () => {
    it('skips acquiring the camera when it was last left off', async () => {
      localStorage.setItem('preJoinLobbyPrefs', JSON.stringify({ cameraEnabled: false, microphoneEnabled: true, blurEnabled: false }));
      const createVideoSpy = spyOn(livekitClient, 'createLocalVideoTrack');
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));

      await component.ngOnInit();

      expect(createVideoSpy).not.toHaveBeenCalled();
      expect(component.cameraEnabled()).toBe(false);
    });

    it('re-applies blur on init when it was last left on', async () => {
      localStorage.setItem('preJoinLobbyPrefs', JSON.stringify({ cameraEnabled: true, microphoneEnabled: false, blurEnabled: true }));
      const fakeVideoTrack = {
        stop: jasmine.createSpy('stop'),
        setProcessor: jasmine.createSpy('setProcessor').and.resolveTo(undefined),
        stopProcessor: jasmine.createSpy('stopProcessor').and.resolveTo(undefined),
      } as unknown as livekitClient.LocalVideoTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);

      await component.ngOnInit();

      expect(fakeVideoTrack.setProcessor).toHaveBeenCalled();
      expect(component.blurEnabled()).toBe(true);
    });

    it('defaults to camera and mic on, blur off, when nothing is stored yet', async () => {
      const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);

      await component.ngOnInit();

      expect(component.cameraEnabled()).toBe(true);
      expect(component.microphoneEnabled()).toBe(true);
      expect(component.blurEnabled()).toBe(false);
    });

    it('writes the current choice back to localStorage on every toggle', async () => {
      const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      await component.ngOnInit();

      await component.setCameraEnabled(false);

      const stored = JSON.parse(localStorage.getItem('preJoinLobbyPrefs')!);
      expect(stored.cameraEnabled).toBe(false);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `packages/web/`): `npm test -- pre-join-lobby.component.spec.ts`
Expected: FAIL — camera/mic are still unconditionally acquired regardless of stored prefs, and nothing is written to `localStorage`.

- [ ] **Step 3: Implement persistence**

In `pre-join-lobby.component.ts`, add near the top of the file (module scope, above the `@Component` decorator):

```typescript
const STORAGE_KEY = 'preJoinLobbyPrefs';

interface PreJoinLobbyPrefs {
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  blurEnabled: boolean;
}
```

Replace `ngOnInit`:

```typescript
  async ngOnInit(): Promise<void> {
    const prefs = this.readPrefs();
    await Promise.allSettled([
      prefs.cameraEnabled ? this.startCamera() : Promise.resolve(),
      prefs.microphoneEnabled ? this.startMicrophone() : Promise.resolve(),
    ]);
    if (prefs.blurEnabled && this.videoTrack()) {
      await this.setBlurEnabled(true);
    }
  }

  private readPrefs (): PreJoinLobbyPrefs {
    const defaults: PreJoinLobbyPrefs = { cameraEnabled: true, microphoneEnabled: true, blurEnabled: false };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return defaults;
      }
      const parsed = JSON.parse(raw);
      return {
        cameraEnabled: parsed.cameraEnabled ?? defaults.cameraEnabled,
        microphoneEnabled: parsed.microphoneEnabled ?? defaults.microphoneEnabled,
        blurEnabled: parsed.blurEnabled ?? defaults.blurEnabled,
      };
    } catch {
      return defaults;
    }
  }

  private writePrefs (): void {
    const prefs: PreJoinLobbyPrefs = {
      cameraEnabled: this.cameraEnabled(),
      microphoneEnabled: this.microphoneEnabled(),
      blurEnabled: this.blurEnabled(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Best-effort only - a full/blocked localStorage must never break the lobby.
    }
  }
```

Note `ngOnInit` no longer calls `this.startCamera()`/`this.startMicrophone()` unconditionally — when a preference is off, `cameraEnabled`/`microphoneEnabled` simply stay at their `signal(false)` default, matching the "skip acquiring" test above.

Call `this.writePrefs()` at the end of each toggle method:

```typescript
  async setCameraEnabled(value: boolean): Promise<void> {
    if (value) {
      await this.startCamera();
    } else {
      this.videoTrack()?.stop();
      this.videoTrack.set(undefined);
      this.cameraEnabled.set(false);
    }
    this.writePrefs();
  }

  async setMicrophoneEnabled(value: boolean): Promise<void> {
    if (value) {
      await this.startMicrophone();
    } else {
      this.stopLevelMeter();
      this.audioTrack()?.stop();
      this.audioTrack.set(undefined);
      this.microphoneEnabled.set(false);
    }
    this.writePrefs();
  }
```

And at the end of `setBlurEnabled`, after both the success and stop-processor branches (i.e. call it once, after the `if (value) {...} else {...}` block, not inside the `catch`):

```typescript
  async setBlurEnabled (value: boolean): Promise<void> {
    const track = this.videoTrack();
    if (!track) {
      return;
    }
    if (value) {
      try {
        this.processor = BackgroundProcessor({ mode: 'background-blur', blurRadius: 10 });
        await track.setProcessor(this.processor);
        this.blurEnabled.set(true);
        this.blurUnavailable.set(false);
      } catch {
        this.processor = undefined;
        this.blurEnabled.set(false);
        this.blurUnavailable.set(true);
        return;
      }
    } else {
      await track.stopProcessor();
      this.processor = undefined;
      this.blurEnabled.set(false);
    }
    this.writePrefs();
  }
```

(A failed `setProcessor` returns early without persisting — an unsupported browser shouldn't get "remembered" as blur-on for next time.)

- [ ] **Step 4: Run test to verify it passes**

Run (from `packages/web/`): `npm test -- pre-join-lobby.component.spec.ts`
Expected: PASS (16 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/meeting-room/pre-join-lobby
git commit -m "$(cat <<'EOF'
feat(meeting-links): persist pre-join lobby camera/mic/blur choice

Task: https://tslen.ds.bidscube.com/pages/tasks-list/10;title=T-slen%2520Workhub;task=417
EOF
)"
```

---

## Task 5: Join button, `joined` output, and track cleanup on destroy

**Files:**
- Modify: `packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.ts`
- Modify: `packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.html`
- Modify: `packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.spec.ts`
- Modify: `packages/web/src/assets/i18n/en.json`

**Interfaces:**
- Produces: `PreJoinResult` interface (exported) `{ videoTrack: LocalVideoTrack | undefined; audioTrack: LocalAudioTrack | undefined; blurEnabled: boolean }`; `PreJoinLobbyComponent.joined = output<PreJoinResult>()`; `join(): void`; implements `OnDestroy`, stopping tracks only when they were never handed off via `joined`.

- [ ] **Step 1: Write the failing test**

Add to `pre-join-lobby.component.spec.ts`:

```typescript
  describe('joining', () => {
    it('emits the current tracks and blur state, and stops the level meter', async () => {
      const fakeVideoTrack = {
        stop: jasmine.createSpy('stop'),
        setProcessor: jasmine.createSpy('setProcessor').and.resolveTo(undefined),
      } as unknown as livekitClient.LocalVideoTrack;
      const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);
      spyOn(livekitClient, 'createAudioAnalyser').and.returnValue({ calculateVolume: () => 0, analyser: {} as AnalyserNode, cleanup: jasmine.createSpy('cleanup').and.resolveTo(undefined) });
      spyOn(window, 'requestAnimationFrame').and.returnValue(1);
      spyOn(window, 'cancelAnimationFrame');
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);
      await component.ngOnInit();
      await component.setBlurEnabled(true);
      const joinedSpy = jasmine.createSpy('joined');
      component.joined.subscribe(joinedSpy);

      component.join();

      expect(joinedSpy).toHaveBeenCalledWith({ videoTrack: fakeVideoTrack, audioTrack: fakeAudioTrack, blurEnabled: true });
      expect(window.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('emits undefined tracks for whichever device was left off', async () => {
      spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('camera off in this test'));
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('mic off in this test'));
      await component.ngOnInit();
      const joinedSpy = jasmine.createSpy('joined');
      component.joined.subscribe(joinedSpy);

      component.join();

      expect(joinedSpy).toHaveBeenCalledWith({ videoTrack: undefined, audioTrack: undefined, blurEnabled: false });
    });

    it('does not stop the handed-off tracks on destroy', async () => {
      const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);
      spyOn(livekitClient, 'createAudioAnalyser').and.returnValue({ calculateVolume: () => 0, analyser: {} as AnalyserNode, cleanup: jasmine.createSpy('cleanup').and.resolveTo(undefined) });
      spyOn(window, 'requestAnimationFrame').and.returnValue(1);
      spyOn(window, 'cancelAnimationFrame');
      await component.ngOnInit();
      component.join();

      component.ngOnDestroy();

      expect(fakeVideoTrack.stop).not.toHaveBeenCalled();
      expect(fakeAudioTrack.stop).not.toHaveBeenCalled();
    });

    it('stops any live tracks on destroy when the lobby was abandoned without joining', async () => {
      const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);
      spyOn(livekitClient, 'createAudioAnalyser').and.returnValue({ calculateVolume: () => 0, analyser: {} as AnalyserNode, cleanup: jasmine.createSpy('cleanup').and.resolveTo(undefined) });
      spyOn(window, 'requestAnimationFrame').and.returnValue(1);
      spyOn(window, 'cancelAnimationFrame');
      await component.ngOnInit();

      component.ngOnDestroy();

      expect(fakeVideoTrack.stop).toHaveBeenCalled();
      expect(fakeAudioTrack.stop).toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `packages/web/`): `npm test -- pre-join-lobby.component.spec.ts`
Expected: FAIL — `component.join is not a function` / `component.joined is undefined`

- [ ] **Step 3: Implement `join`/`ngOnDestroy`**

In `pre-join-lobby.component.ts`:

Replace the `Component`/class-level imports line:
```typescript
import { Component, OnInit, input, signal, ChangeDetectionStrategy } from '@angular/core';
```
with:
```typescript
import { Component, OnDestroy, OnInit, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
```

Add, above the `@Component` decorator (next to `PreJoinLobbyPrefs`):

```typescript
export interface PreJoinResult {
  videoTrack: LocalVideoTrack | undefined;
  audioTrack: LocalAudioTrack | undefined;
  blurEnabled: boolean;
}
```

Change the class declaration and add the output + a hand-off flag:

```typescript
export class PreJoinLobbyComponent implements OnInit, OnDestroy {
  displayName = input.required<string>();
  joined = output<PreJoinResult>();
```

(keep all the existing signals/fields below as they are), and add near the other private fields:

```typescript
  private handedOff = false;
```

Add the two new methods (anywhere among the public methods):

```typescript
  join (): void {
    this.handedOff = true;
    this.stopLevelMeter();
    this.joined.emit({
      videoTrack: this.videoTrack(),
      audioTrack: this.audioTrack(),
      blurEnabled: this.blurEnabled(),
    });
  }

  ngOnDestroy (): void {
    this.stopLevelMeter();
    if (!this.handedOff) {
      this.videoTrack()?.stop();
      this.audioTrack()?.stop();
    }
  }
```

- [ ] **Step 4: Add the Join button to the template**

At the end of `pre-join-lobby.component.html`, after the closing `</div>` of `.pre-join-controls`:

```html
  <button type="button" class="btn btn-primary pre-join-join-btn" (click)="join()">
    {{ 'pre_join_lobby.join' | translate }}
  </button>
```

- [ ] **Step 5: Add the translation key**

In `packages/web/src/assets/i18n/en.json`, replace the `pre_join_lobby` block (same location, between `meeting_room` and `guest_meeting`) with:

```json
  "pre_join_lobby": {
    "title": "Check your camera and microphone",
    "camera_unavailable": "Camera unavailable",
    "microphone_unavailable": "Microphone unavailable",
    "blur": "Blur background",
    "blur_unavailable": "Background blur isn't supported in this browser",
    "join": "Join meeting"
  },
```

- [ ] **Step 6: Run test to verify it passes**

Run (from `packages/web/`): `npm test -- pre-join-lobby.component.spec.ts`
Expected: PASS (20 tests)

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/app/meeting-room/pre-join-lobby packages/web/src/assets/i18n/en.json
git commit -m "$(cat <<'EOF'
feat(meeting-links): add join hand-off and track cleanup to pre-join lobby

Task: https://tslen.ds.bidscube.com/pages/tasks-list/10;title=T-slen%2520Workhub;task=417
EOF
)"
```

---

## Task 6: `MeetingRoomComponent` — publish lobby-provided tracks instead of force-enabling

**Files:**
- Modify: `packages/web/src/app/meeting-room/meeting-room.component.ts`
- Modify: `packages/web/src/app/meeting-room/meeting-room.component.spec.ts`

**Interfaces:**
- Consumes: `PreJoinResult`'s shape (Task 5) — the two tracks come in as new inputs, not the type itself.
- Produces: new inputs `initialVideoTrack = input<LocalVideoTrack | undefined>(undefined)`, `initialAudioTrack = input<LocalAudioTrack | undefined>(undefined)`; new method `publishInitialTracks(room: Room): Promise<void>` (public, directly testable against a fake room the same way `registerRoomEventHandlers` already is). `microphoneEnabled`'s default changes from `signal<boolean>(true)` to `signal<boolean>(false)` — it now only becomes `true` once an actual mic track is published, matching `cameraIsEnable`'s existing default-`false` pattern.

- [ ] **Step 1: Write the failing test**

In `meeting-room.component.spec.ts`, first extend the fake room's `localParticipant` (inside `createFakeRoom()`) with a `publishTrack` spy — replace:

```typescript
    localParticipant: {
      videoTrackPublications,
      setCameraEnabled: jasmine.createSpy('setCameraEnabled').and.resolveTo(undefined),
      setMicrophoneEnabled: jasmine.createSpy('setMicrophoneEnabled').and.resolveTo(undefined),
      setScreenShareEnabled: jasmine.createSpy('setScreenShareEnabled').and.resolveTo(undefined),
      publishData: jasmine.createSpy('publishData'),
    },
```

with:

```typescript
    localParticipant: {
      videoTrackPublications,
      setCameraEnabled: jasmine.createSpy('setCameraEnabled').and.resolveTo(undefined),
      setMicrophoneEnabled: jasmine.createSpy('setMicrophoneEnabled').and.resolveTo(undefined),
      setScreenShareEnabled: jasmine.createSpy('setScreenShareEnabled').and.resolveTo(undefined),
      publishData: jasmine.createSpy('publishData'),
      publishTrack: jasmine.createSpy('publishTrack').and.resolveTo(undefined),
    },
```

Then, near the bottom of the outer `describe('MeetingRoomComponent', ...)` block (as a sibling of the existing `describe('local video tracks', ...)`), add:

```typescript
  describe('publishing lobby-provided tracks', () => {
    it('publishes the given video track, marks the camera enabled, and points the local tile at it', async () => {
      const room = attachFakeRoom();
      const fakeVideoTrack = { sid: 'v1' } as unknown as LocalVideoTrack;
      room.videoTrackPublications.set('cam', { source: 'camera', kind: 'video', videoTrack: fakeVideoTrack });
      fixture.componentRef.setInput('initialVideoTrack', fakeVideoTrack);

      await component.publishInitialTracks(room as never);

      expect(room.localParticipant.publishTrack).toHaveBeenCalledWith(fakeVideoTrack);
      expect(component.cameraIsEnable()).toBe(true);
      expect(component.localTrack()).toBe(fakeVideoTrack as never);
    });

    it('publishes the given audio track and marks the microphone enabled', async () => {
      const room = attachFakeRoom();
      const fakeAudioTrack = { sid: 'a1' } as unknown as LocalAudioTrack;
      fixture.componentRef.setInput('initialAudioTrack', fakeAudioTrack);

      await component.publishInitialTracks(room as never);

      expect(room.localParticipant.publishTrack).toHaveBeenCalledWith(fakeAudioTrack);
      expect(component.microphoneEnabled()).toBe(true);
    });

    it('publishes nothing and leaves both devices off when the lobby handed over no tracks', async () => {
      const room = attachFakeRoom();

      await component.publishInitialTracks(room as never);

      expect(room.localParticipant.publishTrack).not.toHaveBeenCalled();
      expect(component.cameraIsEnable()).toBe(false);
      expect(component.microphoneEnabled()).toBe(false);
    });
  });
```

Also add `LocalAudioTrack` to the existing `livekit-client` import at the top of the spec file — replace:
```typescript
import { RoomEvent } from 'livekit-client';
```
with:
```typescript
import { LocalAudioTrack, LocalVideoTrack, RoomEvent } from 'livekit-client';
```

And hoist `fixture` out of `beforeEach` so the new tests can call `fixture.componentRef.setInput(...)` — replace:
```typescript
describe('MeetingRoomComponent', () => {
  let component: MeetingRoomComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MeetingRoomComponent, TranslateModule.forRoot()],
    });

    const fixture = TestBed.createComponent(MeetingRoomComponent);
    component = fixture.componentInstance;
```
with:
```typescript
describe('MeetingRoomComponent', () => {
  let component: MeetingRoomComponent;
  let fixture: ComponentFixture<MeetingRoomComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MeetingRoomComponent, TranslateModule.forRoot()],
    });

    fixture = TestBed.createComponent(MeetingRoomComponent);
    component = fixture.componentInstance;
```

And add `ComponentFixture` to the `@angular/core/testing` import at the top — replace:
```typescript
import { TestBed } from '@angular/core/testing';
```
with:
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `packages/web/`): `npm test -- meeting-room.component.spec.ts`
Expected: FAIL — `component.publishInitialTracks is not a function`

- [ ] **Step 3: Implement the new inputs and `publishInitialTracks`**

In `meeting-room.component.ts`, update the `livekit-client` import — replace:
```typescript
import {
  LocalTrackPublication,
  LocalVideoTrack,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  VideoPresets,
} from 'livekit-client';
```
with:
```typescript
import {
  LocalAudioTrack,
  LocalTrackPublication,
  LocalVideoTrack,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  VideoPresets,
} from 'livekit-client';
```

Add the two new inputs, right after the existing three:
```typescript
  livekitToken = input.required<string>();
  roomName = input.required<string>();
  displayName = input.required<string>();
  initialVideoTrack = input<LocalVideoTrack | undefined>(undefined);
  initialAudioTrack = input<LocalAudioTrack | undefined>(undefined);
  leaveRoomOutput = output();
```

Change `microphoneEnabled`'s default — replace:
```typescript
  microphoneEnabled = signal<boolean>(true);
```
with:
```typescript
  microphoneEnabled = signal<boolean>(false);
```

Replace `joinRoom`'s body — the current version:
```typescript
  async joinRoom (): Promise<void> {
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
    });
    this.room.set(room);
    this.registerRoomEventHandlers(room);

    try {
      await room.connect(environment.livekitUrl, this.livekitToken());
      await room.localParticipant.setCameraEnabled(true);
      await room.localParticipant.setMicrophoneEnabled(true);
      this.cameraIsEnable.set(true);
      const cameraTrack = this.findLocalVideoTrack(room, 'camera');
      if (cameraTrack) {
        this.localCameraTrack.set(cameraTrack);
        this.localTrack.set(cameraTrack);
      }
    } catch {
      await this.leaveRoom();
    }
  }
```
becomes:
```typescript
  async joinRoom (): Promise<void> {
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
    });
    this.room.set(room);
    this.registerRoomEventHandlers(room);

    try {
      await room.connect(environment.livekitUrl, this.livekitToken());
      await this.publishInitialTracks(room);
    } catch {
      await this.leaveRoom();
    }
  }

  async publishInitialTracks (room: Room): Promise<void> {
    const videoTrack = this.initialVideoTrack();
    if (videoTrack) {
      await room.localParticipant.publishTrack(videoTrack);
      this.cameraIsEnable.set(true);
      const cameraTrack = this.findLocalVideoTrack(room, 'camera');
      if (cameraTrack) {
        this.localCameraTrack.set(cameraTrack);
        this.localTrack.set(cameraTrack);
      }
    }
    const audioTrack = this.initialAudioTrack();
    if (audioTrack) {
      await room.localParticipant.publishTrack(audioTrack);
      this.microphoneEnabled.set(true);
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `packages/web/`): `npm test -- meeting-room.component.spec.ts`
Expected: PASS (all existing tests plus the 3 new ones)

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/meeting-room/meeting-room.component.ts packages/web/src/app/meeting-room/meeting-room.component.spec.ts
git commit -m "$(cat <<'EOF'
feat(meeting-links): publish lobby-provided tracks instead of forcing devices on

Task: https://tslen.ds.bidscube.com/pages/tasks-list/10;title=T-slen%2520Workhub;task=417
EOF
)"
```

---

## Task 7: Wire the lobby into `GuestMeetingLandingComponent`

**Files:**
- Modify: `packages/web/src/app/guest-meeting/guest-meeting-landing.component.ts`
- Modify: `packages/web/src/app/guest-meeting/guest-meeting-landing.component.html`
- Modify: `packages/web/src/app/guest-meeting/guest-meeting-landing.component.spec.ts`

**Interfaces:**
- Consumes: `PreJoinLobbyComponent` (selector `app-pre-join-lobby`, input `displayName`, output `joined: PreJoinResult`) from Task 5; `MeetingRoomComponent`'s new `initialVideoTrack`/`initialAudioTrack` inputs from Task 6.
- Produces: `state` signal's union gains `'lobby'` between `'ready'` and `'in-call'`; `continueToLobby()` replaces the old `join()` (validates the name, no backend call); `onLobbyJoined(result: PreJoinResult)` does the backend call that used to live in `join()`.

- [ ] **Step 1: Write the failing test**

Replace the whole `guest-meeting-landing.component.spec.ts` file:

```typescript
// packages/web/src/app/guest-meeting/guest-meeting-landing.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { LocalVideoTrack } from 'livekit-client';
import { GuestMeetingLandingComponent } from './guest-meeting-landing.component';
import { DataService } from '../services/data.service';

describe('GuestMeetingLandingComponent', () => {
  let component: GuestMeetingLandingComponent;
  let fixture: ComponentFixture<GuestMeetingLandingComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;

  beforeEach(async () => {
    dataServiceSpy = jasmine.createSpyObj('DataService', ['getPublicMeetingLink', 'joinMeetingAsGuest']);

    await TestBed.configureTestingModule({
      imports: [GuestMeetingLandingComponent, TranslateModule.forRoot()],
      providers: [{ provide: DataService, useValue: dataServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(GuestMeetingLandingComponent);
    component = fixture.componentInstance;
  });

  it('shows the join form for a valid token', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(of({ title: 'Standup', hostName: 'Ada Lovelace', roomName: 'meeting-abc' }));
    fixture.componentRef.setInput('token', 'plain-token');

    fixture.detectChanges();

    expect(component.state()).toBe('ready');
    expect(component.meetingInfo()?.hostName).toBe('Ada Lovelace');
  });

  it('shows an invalid state when the link is unknown or expired', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(throwError(() => new Error('not found')));
    fixture.componentRef.setInput('token', 'bad-token');

    fixture.detectChanges();

    expect(component.state()).toBe('invalid');
  });

  it('moves to the lobby with a valid display name, without calling the backend yet', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(of({ title: 'Standup', hostName: 'Ada Lovelace', roomName: 'meeting-abc' }));
    fixture.componentRef.setInput('token', 'plain-token');
    fixture.detectChanges();

    component.displayNameControl.setValue('Visiting Guest');
    component.continueToLobby();

    expect(component.state()).toBe('lobby');
    expect(dataServiceSpy.joinMeetingAsGuest).not.toHaveBeenCalled();
  });

  it('does not leave the join form when the display name is blank', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(of({ title: 'Standup', hostName: 'Ada Lovelace', roomName: 'meeting-abc' }));
    fixture.componentRef.setInput('token', 'plain-token');
    fixture.detectChanges();

    component.continueToLobby();

    expect(component.state()).toBe('ready');
  });

  it('mints a guest token once the lobby hands off, carrying its tracks into the call', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(of({ title: 'Standup', hostName: 'Ada Lovelace', roomName: 'meeting-abc' }));
    dataServiceSpy.joinMeetingAsGuest.and.returnValue(of({ livekitToken: 'guest-jwt', roomName: 'meeting-abc' }));
    fixture.componentRef.setInput('token', 'plain-token');
    fixture.detectChanges();
    component.displayNameControl.setValue('Visiting Guest');
    component.continueToLobby();
    const fakeVideoTrack = { sid: 'v1' } as unknown as LocalVideoTrack;

    component.onLobbyJoined({ videoTrack: fakeVideoTrack, audioTrack: undefined, blurEnabled: true });

    expect(dataServiceSpy.joinMeetingAsGuest).toHaveBeenCalledWith('plain-token', 'Visiting Guest');
    expect(component.state()).toBe('in-call');
    expect(component.connection()).toEqual({
      livekitToken: 'guest-jwt', roomName: 'meeting-abc', displayName: 'Visiting Guest', videoTrack: fakeVideoTrack, audioTrack: undefined,
    });
  });

  it('shows a join error and stays in the lobby (tracks stay live for a retry) when joining fails', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(of({ title: 'Standup', hostName: 'Ada Lovelace', roomName: 'meeting-abc' }));
    dataServiceSpy.joinMeetingAsGuest.and.returnValue(throwError(() => new Error('link revoked')));
    fixture.componentRef.setInput('token', 'plain-token');
    fixture.detectChanges();
    component.displayNameControl.setValue('Visiting Guest');
    component.continueToLobby();

    component.onLobbyJoined({ videoTrack: undefined, audioTrack: undefined, blurEnabled: false });

    expect(component.state()).toBe('lobby');
    expect(component.connection()).toBeNull();
    expect(component.joinError()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `packages/web/`): `npm test -- guest-meeting-landing.component.spec.ts`
Expected: FAIL — `component.continueToLobby is not a function` / `component.onLobbyJoined is not a function`

- [ ] **Step 3: Update the component**

Replace `guest-meeting-landing.component.ts` in full:

```typescript
// packages/web/src/app/guest-meeting/guest-meeting-landing.component.ts
import { Component, OnInit, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LocalAudioTrack, LocalVideoTrack } from 'livekit-client';
import { DataService } from '../services/data.service';
import { MeetingRoomComponent } from '../meeting-room/meeting-room.component';
import { PreJoinLobbyComponent, PreJoinResult } from '../meeting-room/pre-join-lobby/pre-join-lobby.component';

interface MeetingInfo {
  title: string | null;
  hostName: string;
  roomName: string;
}

interface GuestConnection {
  livekitToken: string;
  roomName: string;
  displayName: string;
  videoTrack: LocalVideoTrack | undefined;
  audioTrack: LocalAudioTrack | undefined;
}

@Component({
  selector: 'app-guest-meeting-landing',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, MeetingRoomComponent, PreJoinLobbyComponent],
  templateUrl: './guest-meeting-landing.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './guest-meeting-landing.component.css',
})
export class GuestMeetingLandingComponent implements OnInit {
  private dataService = inject(DataService);

  token = input<string>('');

  state = signal<'loading' | 'invalid' | 'ready' | 'lobby' | 'in-call'>('loading');
  meetingInfo = signal<MeetingInfo | null>(null);
  connection = signal<GuestConnection | null>(null);
  joinError = signal(false);
  displayNameControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  ngOnInit(): void {
    this.dataService.getPublicMeetingLink(this.token()).subscribe({
      next: (info) => {
        this.meetingInfo.set(info);
        this.state.set('ready');
      },
      error: () => this.state.set('invalid'),
    });
  }

  continueToLobby(): void {
    if (this.displayNameControl.invalid) {
      return;
    }
    this.joinError.set(false);
    this.state.set('lobby');
  }

  onLobbyJoined(result: PreJoinResult): void {
    const displayName = this.displayNameControl.value;
    this.joinError.set(false);
    this.dataService.joinMeetingAsGuest(this.token(), displayName).subscribe({
      next: (joinResult) => {
        this.connection.set({
          livekitToken: joinResult.livekitToken,
          roomName: joinResult.roomName,
          displayName,
          videoTrack: result.videoTrack,
          audioTrack: result.audioTrack,
        });
        this.state.set('in-call');
      },
      error: () => this.joinError.set(true),
    });
  }

  onLeave(): void {
    this.connection.set(null);
    this.state.set('ready');
  }
}
```

- [ ] **Step 4: Update the template**

Replace `guest-meeting-landing.component.html` in full:

```html
<!-- packages/web/src/app/guest-meeting/guest-meeting-landing.component.html -->
<div class="guest-meeting-page">
  @switch (state()) {
    @case ('loading') {
      <p>{{ 'guest_meeting.loading' | translate }}</p>
    }
    @case ('invalid') {
      <p>{{ 'guest_meeting.invalid_link' | translate }}</p>
    }
    @case ('ready') {
      <div class="guest-join-card">
        <h2>{{ meetingInfo()?.title || ('guest_meeting.untitled' | translate) }}</h2>
        <p>{{ 'guest_meeting.hosted_by' | translate: { name: meetingInfo()?.hostName } }}</p>
        <input
          type="text"
          [formControl]="displayNameControl"
          [placeholder]="'guest_meeting.your_name' | translate"
        />
        <button class="btn btn-primary" [disabled]="displayNameControl.invalid" (click)="continueToLobby()">
          {{ 'guest_meeting.join' | translate }}
        </button>
      </div>
    }
    @case ('lobby') {
      <app-pre-join-lobby
        [displayName]="displayNameControl.value"
        (joined)="onLobbyJoined($event)"
      ></app-pre-join-lobby>
      @if (joinError()) {
        <p class="guest-join-error">{{ 'guest_meeting.join_error' | translate }}</p>
      }
    }
    @case ('in-call') {
      <app-meeting-room
        [livekitToken]="connection()!.livekitToken"
        [roomName]="connection()!.roomName"
        [displayName]="connection()!.displayName"
        [initialVideoTrack]="connection()!.videoTrack"
        [initialAudioTrack]="connection()!.audioTrack"
        (leaveRoomOutput)="onLeave()"
      ></app-meeting-room>
    }
  }
</div>
```

- [ ] **Step 5: Run test to verify it passes**

Run (from `packages/web/`): `npm test -- guest-meeting-landing.component.spec.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/app/guest-meeting
git commit -m "$(cat <<'EOF'
feat(guest-meeting): add pre-join lobby step before a guest joins

Task: https://tslen.ds.bidscube.com/pages/tasks-list/10;title=T-slen%2520Workhub;task=417
EOF
)"
```

---

## Task 8: Wire the lobby into `MeetingLinksManagerComponent` (host flow)

**Files:**
- Modify: `packages/web/src/app/pages/meeting-links/meeting-links-manager.component.ts`
- Modify: `packages/web/src/app/pages/meeting-links/meeting-links-manager.component.html`
- Modify: `packages/web/src/app/pages/meeting-links/meeting-links-manager.component.spec.ts`

**Interfaces:**
- Consumes: same `PreJoinLobbyComponent`/`PreJoinResult` and `MeetingRoomComponent` inputs as Task 7.
- Produces: `lobbyLink: Signal<MeetingLinkRow | null>` and `hostDisplayName(): string`; `joinOwnMeeting(link)` now just opens the lobby (no backend call); `onLobbyJoined(result: PreJoinResult)` does the `sendToken` call that used to live in `joinOwnMeeting`.

- [ ] **Step 1: Write the failing test**

In `meeting-links-manager.component.spec.ts`, add `LocalVideoTrack` to the imports at the top:

```typescript
import { LocalVideoTrack } from 'livekit-client';
```

Replace the two existing tests `'joining an existing link mints a host LiveKit token for that roomName'` and `'warns via toastr when joining a meeting fails'` with:

```typescript
  it('opens the pre-join lobby for the clicked link without minting a token yet', () => {
    component.joinOwnMeeting(existingLink);

    expect(component.lobbyLink()).toEqual(existingLink);
    expect(dataServiceSpy.sendToken).not.toHaveBeenCalled();
  });

  it('mints a host LiveKit token once the lobby hands off, carrying its tracks into the call', () => {
    dataServiceSpy.sendToken.and.returnValue(of({ token: 'host-livekit-jwt' }));
    component.joinOwnMeeting(existingLink);
    const fakeVideoTrack = { sid: 'v1' } as unknown as LocalVideoTrack;

    component.onLobbyJoined({ videoTrack: fakeVideoTrack, audioTrack: undefined, blurEnabled: false });

    expect(dataServiceSpy.sendToken).toHaveBeenCalledWith('/api/token', { roomName: 'meeting-abc', participantName: 'Ada-Lovelace' });
    expect(component.activeRoom()).toEqual({
      livekitToken: 'host-livekit-jwt', roomName: 'meeting-abc', displayName: 'Ada-Lovelace', videoTrack: fakeVideoTrack, audioTrack: undefined,
    });
    expect(component.lobbyLink()).toBeNull();
  });

  it('warns via toastr when joining a meeting fails and keeps the lobby open for a retry', () => {
    dataServiceSpy.sendToken.and.returnValue(throwError(() => new Error('server error')));
    component.joinOwnMeeting(existingLink);

    component.onLobbyJoined({ videoTrack: undefined, audioTrack: undefined, blurEnabled: false });

    expect(toastrSpy.warning).toHaveBeenCalled();
    expect(component.lobbyLink()).toEqual(existingLink);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `packages/web/`): `npm test -- meeting-links-manager.component.spec.ts`
Expected: FAIL — `component.lobbyLink is not a function` / `component.onLobbyJoined is not a function`

- [ ] **Step 3: Update the component**

In `meeting-links-manager.component.ts`, update imports — replace:
```typescript
import { MeetingRoomComponent } from '../../meeting-room/meeting-room.component';
```
with:
```typescript
import { LocalAudioTrack, LocalVideoTrack } from 'livekit-client';
import { MeetingRoomComponent } from '../../meeting-room/meeting-room.component';
import { PreJoinLobbyComponent, PreJoinResult } from '../../meeting-room/pre-join-lobby/pre-join-lobby.component';
```

Add `PreJoinLobbyComponent` to the `@Component` `imports` array, next to `MeetingRoomComponent`.

Replace the `HostConnection` interface:
```typescript
interface HostConnection {
  livekitToken: string;
  roomName: string;
  displayName: string;
}
```
with:
```typescript
interface HostConnection {
  livekitToken: string;
  roomName: string;
  displayName: string;
  videoTrack: LocalVideoTrack | undefined;
  audioTrack: LocalAudioTrack | undefined;
}
```

Add a `lobbyLink` signal next to `activeRoom`:
```typescript
  activeRoom = signal<HostConnection | null>(null);
  lobbyLink = signal<MeetingLinkRow | null>(null);
```

Replace `joinOwnMeeting`/`onLeaveOwnMeeting`:
```typescript
  joinOwnMeeting(link: MeetingLinkRow): void {
    const user = this.auth.authDataSignal();
    const participantName = `${user.firstName}-${user.lastName}`;
    this.dataService.sendToken('/api/token', { roomName: link.roomName, participantName }).subscribe({
      next: (result) => {
        this.activeRoom.set({ livekitToken: result.token, roomName: link.roomName, displayName: participantName });
      },
      error: () => this.toastr.warning('Could not join meeting'),
    });
  }

  onLeaveOwnMeeting(): void {
    this.activeRoom.set(null);
  }
```
with:
```typescript
  joinOwnMeeting(link: MeetingLinkRow): void {
    this.lobbyLink.set(link);
  }

  hostDisplayName(): string {
    const user = this.auth.authDataSignal();
    return `${user.firstName}-${user.lastName}`;
  }

  onLobbyJoined(result: PreJoinResult): void {
    const link = this.lobbyLink();
    if (!link) {
      return;
    }
    const participantName = this.hostDisplayName();
    this.dataService.sendToken('/api/token', { roomName: link.roomName, participantName }).subscribe({
      next: (tokenResult) => {
        this.activeRoom.set({
          livekitToken: tokenResult.token,
          roomName: link.roomName,
          displayName: participantName,
          videoTrack: result.videoTrack,
          audioTrack: result.audioTrack,
        });
        this.lobbyLink.set(null);
      },
      error: () => this.toastr.warning('Could not join meeting'),
    });
  }

  onLeaveOwnMeeting(): void {
    this.activeRoom.set(null);
  }
```

- [ ] **Step 4: Update the template**

In `meeting-links-manager.component.html`, replace the top-level `@if (activeRoom()) { ... } @else { ... }`:

```html
@if (activeRoom()) {
  <app-meeting-room
    [livekitToken]="activeRoom()!.livekitToken"
    [roomName]="activeRoom()!.roomName"
    [displayName]="activeRoom()!.displayName"
    (leaveRoomOutput)="onLeaveOwnMeeting()"
  ></app-meeting-room>
} @else {
```

with:

```html
@if (activeRoom()) {
  <app-meeting-room
    [livekitToken]="activeRoom()!.livekitToken"
    [roomName]="activeRoom()!.roomName"
    [displayName]="activeRoom()!.displayName"
    [initialVideoTrack]="activeRoom()!.videoTrack"
    [initialAudioTrack]="activeRoom()!.audioTrack"
    (leaveRoomOutput)="onLeaveOwnMeeting()"
  ></app-meeting-room>
} @else if (lobbyLink()) {
  <app-pre-join-lobby
    [displayName]="hostDisplayName()"
    (joined)="onLobbyJoined($event)"
  ></app-pre-join-lobby>
} @else {
```

(The rest of the file — the `<div class="meeting-links-manager">...</div>` block and its closing `}` — is unchanged.)

- [ ] **Step 5: Run test to verify it passes**

Run (from `packages/web/`): `npm test -- meeting-links-manager.component.spec.ts`
Expected: PASS (all existing tests, with the 3 replaced ones passing under their new names)

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/app/pages/meeting-links
git commit -m "$(cat <<'EOF'
feat(meeting-links): add pre-join lobby step before a host joins their own meeting

Task: https://tslen.ds.bidscube.com/pages/tasks-list/10;title=T-slen%2520Workhub;task=417
EOF
)"
```

---

## Task 9: Full test suite and lint sweep

**Files:** none (verification only)

- [ ] **Step 1: Run the full frontend test suite**

Run (from `packages/web/`): `npm test`
Expected: PASS — every spec in `packages/web/src`, including all specs touched or added by Tasks 1–8.

- [ ] **Step 2: Run the frontend linter**

Run (from `packages/web/`): `npm run lint`
Expected: no new violations. Per `AGENTS.md`, `ng lint` only fails on violations not already present in `packages/web/eslint-suppressions.json`; every file this plan touches (`meeting-room.component.ts`, `guest-meeting-landing.component.ts`, `meeting-links-manager.component.ts`, plus the new `pre-join-lobby/` files) should lint clean on new code. If lint fails on a pre-existing suppressed violation in a file this plan modified, regenerate the suppressions file per `AGENTS.md`'s instructions: `./node_modules/.bin/eslint "src/**/*.ts" "src/**/*.html" --suppress-all`.

- [ ] **Step 3: Commit (only if the suppressions file changed)**

```bash
git add packages/web/eslint-suppressions.json
git commit -m "$(cat <<'EOF'
chore(web): regenerate eslint suppressions for pre-join lobby changes

Task: https://tslen.ds.bidscube.com/pages/tasks-list/10;title=T-slen%2520Workhub;task=417
EOF
)"
```
