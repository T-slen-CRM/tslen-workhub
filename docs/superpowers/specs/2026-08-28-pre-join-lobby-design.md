# Pre-Join Lobby (Device Check + Background Blur) — Design

## Problem

Both meeting entry points — the host's own-meeting join
(`meeting-links-manager.component.ts`'s `joinOwnMeeting`) and the guest
join (`guest-meeting-landing.component.ts`'s `join`) — connect straight
into `MeetingRoomComponent`, which unconditionally calls
`setCameraEnabled(true)`/`setMicrophoneEnabled(true)` the moment it
connects (`meeting-room.component.ts`'s `joinRoom`). There's no chance to
preview the camera/mic, confirm they work, or opt into background blur
before other participants can see/hear you.

Workhub task 417 tracks this feature.

## Goal

1. Before either a host or a guest lands in the live call, they pass
   through a lobby that previews their camera and mic and lets them:
   - toggle camera on/off, with a live video preview
   - toggle mic on/off, with a live audio level meter
   - toggle background blur on/off, with the preview reflecting it
2. Whatever camera/mic/blur state they leave the lobby in is exactly
   what they join the call with — the call never force-enables a device
   the user turned off in the lobby.
3. The last-used camera/mic/blur choice is remembered per-browser
   (`localStorage`) so repeat users don't have to re-toggle blur every
   meeting.
4. A device or blur failure (permission denied, no hardware, blur
   unsupported) degrades gracefully — it disables just that toggle with
   an inline note and never blocks joining the meeting.

## Non-goals

- Toggling blur *during* an already-joined call (lobby-only for v1).
- A camera/microphone device picker (dropdown to choose among multiple
  physical devices) — toggle-only for v1, per existing in-call controls
  (`setCameraEnabled`/`setMicrophoneEnabled` already work this way).
- Any backend change — this is entirely client-side; the LiveKit token
  endpoints are unchanged, just called slightly later in the flow.

## Design

### 1. New component: `PreJoinLobbyComponent`

New standalone component at
`packages/web/src/app/meeting-room/pre-join-lobby/pre-join-lobby.component.ts`,
shared by both entry points — matches how `VideoComponent`/
`AudioComponent`/`MeetingChatComponent` are already split out of
`MeetingRoomComponent`.

- **Input:** `displayName = input.required<string>()` — the host already
  knows theirs (from `AuthenticationService`); the guest enters theirs in
  the existing `guest-meeting-landing` name field, which stays unchanged
  and now precedes the lobby instead of the call.
- **Output:** `joined = output<PreJoinResult>()`, where:
  ```ts
  interface PreJoinResult {
    videoTrack: LocalVideoTrack | undefined;
    audioTrack: LocalAudioTrack | undefined;
    blurEnabled: boolean;
  }
  ```
- On init, calls `createLocalVideoTrack()` / `createLocalAudioTrack()`
  (from `livekit-client`, independent of any `Room` — no connection
  needed yet) to get real preview tracks. The video track attaches to a
  local `<video>` preview element; the audio track feeds a Web Audio
  `AnalyserNode` driving a simple level-meter bar.
- Camera/mic toggle buttons stop/restart those tracks (mirrors
  `setCameraEnabled`/`setMicrophoneEnabled`'s semantics but at the raw
  track level, since there's no `Room` yet).
- Blur toggle applies `BackgroundBlur()` from the new
  `@livekit/track-processors` dependency via
  `videoTrack.setProcessor(...)` — the preview itself shows the blurred
  feed, not just a promise it'll be blurred later.
- Last-used camera/mic/blur choice is read from `localStorage` on init
  and written on every toggle.
- "Join meeting" button emits `joined` with whatever
  tracks/blur-state are currently live. A track is `undefined` if that
  device is off or failed — never silently re-enabled.

### 2. Wiring into the two existing entry points

- `guest-meeting-landing.component.ts`: add a `'lobby'` state between
  `'ready'` and `'in-call'`. The current `join()` (rename
  `continueToLobby()`) no longer calls the backend immediately — it just
  validates the display name and moves to `'lobby'`. The
  `dataService.joinMeetingAsGuest(...)` call (mints the LiveKit token)
  moves to a new handler bound to the lobby's `(joined)` output, which
  then transitions to `'in-call'`.
- `meeting-links-manager.component.ts`: same shape. Clicking a row's
  "Join" no longer calls `POST /api/token` immediately; it opens the
  lobby first (no backend call needed for a preview), and the token
  request moves to the lobby's `(joined)` handler.
- `meeting-room.component.ts`: `joinRoom()` changes from unconditionally
  calling `setCameraEnabled(true)`/`setMicrophoneEnabled(true)` to
  accepting the tracks handed down from the lobby as new inputs
  (`initialVideoTrack`/`initialAudioTrack`, both
  `LocalVideoTrack | LocalAudioTrack | undefined`) and publishing exactly
  those via `room.localParticipant.publishTrack(...)`. This avoids a
  second `getUserMedia` prompt/flicker (the lobby's tracks are reused,
  not re-acquired) and means a user who left camera or mic off in the
  lobby actually joins that way instead of the room forcing both on.

### 3. Error handling

- **Permission denied / no device:** `createLocalVideoTrack()` and
  `createLocalAudioTrack()` are awaited via `Promise.allSettled` so a
  camera failure doesn't block the mic or vice versa. The lobby shows a
  short inline message per failed device
  ("Camera unavailable" / "Microphone unavailable") and disables that
  toggle. "Join meeting" stays enabled regardless — joining audio/video-off
  (or both off) is valid, since `joinRoom()` no longer force-enables
  either device.
- **Blur init failure:** `setProcessor()` throwing (no WebAssembly/WebGL
  support, processor script fails to load) is caught, the blur toggle is
  disabled with a short inline note, and the plain (unblurred) video
  track keeps working — blur never blocks the rest of the lobby.
- **Track cleanup:** preview tracks must be `.stop()`'d in `ngOnDestroy`
  and on any path that ends the lobby *without* emitting `joined`
  (e.g. the guest navigates away) — same discipline `meeting-room.
  component.ts`'s `leaveRoom()` already applies to call tracks. On the
  success path (`joined` emitted), the lobby must **not** stop the
  tracks it's handing off — `MeetingRoomComponent` takes ownership and
  publishes them as-is.

### 4. Testing

- `pre-join-lobby.component.spec.ts`: mock `livekit-client`'s
  `createLocalVideoTrack`/`createLocalAudioTrack` and
  `@livekit/track-processors`'s `BackgroundBlur`
  (`jasmine.createSpyObj`, per the `chat.component.spec.ts` pattern from
  AGENTS.md). Cover: toggles start/stop tracks; blur toggle calls
  `setProcessor`; a rejected `createLocalVideoTrack`/`createLocalAudioTrack`
  disables only the affected toggle without throwing or blocking the
  other device; `localStorage` is read on init and written on toggle;
  `joined` emits the current track/blur state, including the
  both-devices-off case.
- `meeting-room.component.spec.ts`: extend for the new
  `initialVideoTrack`/`initialAudioTrack` inputs — assert `publishTrack`
  is called with the given track(s) instead of `setCameraEnabled(true)`/
  `setMicrophoneEnabled(true)` always firing, and that an `undefined`
  input means that device is never force-enabled.
- `guest-meeting-landing.component.spec.ts` /
  `meeting-links-manager.component.spec.ts`: extend the existing
  state-machine tests for the new `'lobby'` state — assert the
  token-minting call now fires on the lobby's `joined` output, not on
  the earlier button/name-submit click.
- No backend changes, so no new e2e/unit specs there.
