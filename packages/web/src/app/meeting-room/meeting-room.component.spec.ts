import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { LocalAudioTrack, LocalVideoTrack, Room, RoomEvent } from 'livekit-client';
import * as trackProcessors from '@livekit/track-processors';
import { MeetingRoomComponent } from './meeting-room.component';
import { BACKGROUND_IMAGE_PRESETS } from './pre-join-lobby/pre-join-lobby.component';

jest.mock('@livekit/track-processors', () => ({
  ...jest.requireActual('@livekit/track-processors'),
  BackgroundProcessor: jasmine.createSpy('BackgroundProcessor'),
}));

type FakeRoom = ReturnType<typeof createFakeRoom>;

/**
 * A stand-in for a LiveKit `Room` that records the handlers the component
 * registers, so a spec can drive `RoomEvent.*` the way the real SDK would.
 */
function createFakeRoom () {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const videoTrackPublications = new Map<string, unknown>();

  return {
    handlers,
    videoTrackPublications,
    on: jasmine.createSpy('on').and.callFake((event: string, cb: (...args: unknown[]) => void) => {
      handlers.set(event, cb);
    }),
    off: jasmine.createSpy('off'),
    connect: jasmine.createSpy('connect').and.resolveTo(undefined),
    switchActiveDevice: jasmine.createSpy('switchActiveDevice').and.resolveTo(true),
    // TestBed's automatic fixture teardown calls ngOnDestroy -> leaveRoom() after every test,
    // so any fake room installed via component.room.set(...) needs a disconnect stub too.
    disconnect: jasmine.createSpy('disconnect').and.resolveTo(undefined),
    localParticipant: {
      identity: 'ada-host',
      videoTrackPublications,
      setCameraEnabled: jasmine.createSpy('setCameraEnabled').and.resolveTo(undefined),
      setMicrophoneEnabled: jasmine.createSpy('setMicrophoneEnabled').and.resolveTo(undefined),
      setScreenShareEnabled: jasmine.createSpy('setScreenShareEnabled').and.resolveTo(undefined),
      publishData: jasmine.createSpy('publishData'),
      publishTrack: jasmine.createSpy('publishTrack').and.resolveTo(undefined),
    },
  };
}

function fireData (room: FakeRoom, payload: unknown, participant?: { name?: string; identity?: string }): void {
  const handler = room.handlers.get(RoomEvent.DataReceived)!;
  handler(new TextEncoder().encode(JSON.stringify(payload)), participant);
}

describe('MeetingRoomComponent', () => {
  let component: MeetingRoomComponent;
  let fixture: ComponentFixture<MeetingRoomComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MeetingRoomComponent, TranslateModule.forRoot()],
    });

    fixture = TestBed.createComponent(MeetingRoomComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('livekitToken', 'fake-token');
    fixture.componentRef.setInput('roomName', 'meeting-abc');
    fixture.componentRef.setInput('displayName', 'Ada');
    spyOn(component, 'joinRoom');
  });

  /** Installs a fake room and wires up the same listeners joinRoom() would. */
  function attachFakeRoom (): FakeRoom {
    const room = createFakeRoom();
    component.room.set(room as never);
    component.registerRoomEventHandlers(room as never);
    return room;
  }

  it('does not auto-connect before ngOnInit runs joinRoom', () => {
    expect(component.joinRoom).not.toHaveBeenCalled();
  });

  it('setCameraEnabled toggles the fake room and the local track when there is no active room', async () => {
    await component.setCameraEnabled(true);

    // No room yet (joinRoom is stubbed) - the guard clause must no-op safely.
    expect(component.cameraIsEnable()).toBe(false);
  });

  it('setCameraEnabled updates state once a room is present', async () => {
    const room = attachFakeRoom();

    await component.setCameraEnabled(true);

    expect(room.localParticipant.setCameraEnabled).toHaveBeenCalledWith(true);
    expect(component.cameraIsEnable()).toBe(true);
  });

  it('leaveRoom disconnects the room and emits leaveRoomOutput', async () => {
    const room = attachFakeRoom();
    const emitSpy = spyOn(component.leaveRoomOutput, 'emit');

    await component.leaveRoom();

    expect(room.disconnect).toHaveBeenCalled();
    expect(component.room()).toBeUndefined();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('toggles the chat panel', () => {
    expect(component.chatOpen()).toBe(false);

    component.chatOpen.set(!component.chatOpen());

    expect(component.chatOpen()).toBe(true);
  });

  describe('remote track map immutability', () => {
    it('hands out a NEW Map reference when a remote track is subscribed', () => {
      const room = attachFakeRoom();
      const before = component.remoteTracksMap();

      room.handlers.get(RoomEvent.TrackSubscribed)!(
        {},
        { trackSid: 'sid-1', kind: 'video' },
        { identity: 'bob' },
      );

      const after = component.remoteTracksMap();
      // An in-place mutation returns the same reference, which Object.is-based
      // signal equality treats as "no change" - OnPush ancestors never repaint.
      expect(after).not.toBe(before);
      expect(after.get('sid-1')?.participantIdentity).toBe('bob');
    });

    it('hands out a NEW Map reference when a remote track is unsubscribed', () => {
      const room = attachFakeRoom();
      room.handlers.get(RoomEvent.TrackSubscribed)!(
        {},
        { trackSid: 'sid-1', kind: 'video' },
        { identity: 'bob' },
      );
      const before = component.remoteTracksMap();

      room.handlers.get(RoomEvent.TrackUnsubscribed)!({}, { trackSid: 'sid-1' });

      const after = component.remoteTracksMap();
      expect(after).not.toBe(before);
      expect(after.has('sid-1')).toBe(false);
    });
  });

  describe('chat', () => {
    it('registers the DataReceived listener with the room, not with the chat panel', () => {
      const room = attachFakeRoom();

      expect(room.on).toHaveBeenCalledWith(RoomEvent.DataReceived, jasmine.any(Function));
    });

    it('keeps messages received while the chat panel is closed', () => {
      const room = attachFakeRoom();
      expect(component.chatOpen()).toBe(false);

      fireData(room, { text: 'hi' }, { identity: 'bob', name: 'Bob' });
      component.chatOpen.set(true);

      const messages = component.messages();
      expect(messages.length).toBe(1);
      expect(messages[0].senderName).toBe('Bob');
      expect(messages[0].text).toBe('hi');
    });

    it('ignores a spoofed senderName in the payload in favour of the real participant', () => {
      const room = attachFakeRoom();

      fireData(room, { senderName: 'Administrator', text: 'trust me' }, { identity: 'mallory' });

      expect(component.messages()[0].senderName).toBe('mallory');
    });

    it('falls back to Unknown when LiveKit reports no participant', () => {
      const room = attachFakeRoom();

      fireData(room, { text: 'hi' }, undefined);

      expect(component.messages()[0].senderName).toBe('Unknown');
    });

    it('drops a payload whose text is missing, blank or not a string', () => {
      const room = attachFakeRoom();

      fireData(room, { senderName: 'Bob' }, { identity: 'bob' });
      fireData(room, { text: 42 }, { identity: 'bob' });
      fireData(room, { text: '   ' }, { identity: 'bob' });

      expect(component.messages()).toEqual([]);
    });

    it('ignores a malformed (non-JSON) payload without crashing', () => {
      const room = attachFakeRoom();
      const handler = room.handlers.get(RoomEvent.DataReceived)!;

      expect(() => handler(new TextEncoder().encode('not json'), { identity: 'bob' })).not.toThrow();
      expect(component.messages()).toEqual([]);
    });

    it('sendChatMessage publishes over the data channel and appends it locally', () => {
      const room = attachFakeRoom();

      component.sendChatMessage('hello there');

      expect(room.localParticipant.publishData).toHaveBeenCalledTimes(1);
      const [payload, options] = room.localParticipant.publishData.calls.mostRecent().args;
      const decoded = JSON.parse(new TextDecoder().decode(payload as Uint8Array));
      expect(decoded.text).toBe('hello there');
      expect(options).toEqual({ reliable: true });
      expect(component.messages().length).toBe(1);
      expect(component.messages()[0].senderName).toBe('Ada');
    });

    it('sendChatMessage ignores an empty or whitespace-only message', () => {
      const room = attachFakeRoom();

      component.sendChatMessage('   ');

      expect(room.localParticipant.publishData).not.toHaveBeenCalled();
      expect(component.messages()).toEqual([]);
    });

    it('leaveRoom unregisters the DataReceived listener', async () => {
      const room = attachFakeRoom();

      await component.leaveRoom();

      expect(room.off).toHaveBeenCalledWith(RoomEvent.DataReceived, jasmine.any(Function));
    });
  });

  describe('local video tracks', () => {
    it('re-reads the published camera track instead of re-attaching a stale one', async () => {
      const room = attachFakeRoom();
      const staleTrack = { sid: 'stale' };
      room.videoTrackPublications.set('cam', { source: 'camera', kind: 'video', videoTrack: staleTrack });

      await component.setCameraEnabled(true);
      expect(component.localTrack()).toBe(staleTrack as never);

      // LiveKit stops AND unpublishes the real track when the camera is disabled...
      room.videoTrackPublications.delete('cam');
      await component.setCameraEnabled(false);
      expect(component.localTrack()).toBeUndefined();

      // ...and creates a brand-new LocalVideoTrack when it is re-enabled.
      const freshTrack = { sid: 'fresh' };
      room.videoTrackPublications.set('cam', { source: 'camera', kind: 'video', videoTrack: freshTrack });
      await component.setCameraEnabled(true);

      expect(component.localTrack()).toBe(freshTrack as never);
    });

    it('points the local tile at the screen-share track while sharing, and back at the camera after', async () => {
      const room = attachFakeRoom();
      const cameraTrack = { sid: 'cam' };
      room.videoTrackPublications.set('cam', { source: 'camera', kind: 'video', videoTrack: cameraTrack });
      await component.setCameraEnabled(true);

      const screenTrack = { sid: 'screen' };
      room.videoTrackPublications.set('screen', { source: 'screen_share', kind: 'video', videoTrack: screenTrack });
      await component.setScreenShareEnabled(true);

      expect(component.screenShareEnabled()).toBe(true);
      expect(component.localTrack()).toBe(screenTrack as never);

      room.videoTrackPublications.delete('screen');
      await component.setScreenShareEnabled(false);

      expect(component.screenShareEnabled()).toBe(false);
      expect(component.localTrack()).toBe(cameraTrack as never);
    });

    it('adopts a camera track LiveKit republishes via LocalTrackPublished', () => {
      const room = attachFakeRoom();
      const fresh = { sid: 'fresh' };

      room.handlers.get(RoomEvent.LocalTrackPublished)!({ kind: 'video', source: 'camera', videoTrack: fresh });

      expect(component.localCameraTrack()).toBe(fresh as never);
      expect(component.localTrack()).toBe(fresh as never);
    });

    it('clears the local tile when LiveKit unpublishes the camera track', () => {
      const room = attachFakeRoom();
      const fresh = { sid: 'fresh' };
      room.handlers.get(RoomEvent.LocalTrackPublished)!({ kind: 'video', source: 'camera', videoTrack: fresh });

      room.handlers.get(RoomEvent.LocalTrackUnpublished)!({ kind: 'video', source: 'camera', videoTrack: fresh });

      expect(component.localCameraTrack()).toBeUndefined();
      expect(component.localTrack()).toBeUndefined();
    });
  });

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

  describe('failure cleanup for lobby-provided tracks', () => {
    it('stopUnpublishedInitialTracks stops both lobby-provided tracks', () => {
      const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as LocalVideoTrack;
      const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as LocalAudioTrack;
      fixture.componentRef.setInput('initialVideoTrack', fakeVideoTrack);
      fixture.componentRef.setInput('initialAudioTrack', fakeAudioTrack);

      component.stopUnpublishedInitialTracks();

      expect(fakeVideoTrack.stop).toHaveBeenCalled();
      expect(fakeAudioTrack.stop).toHaveBeenCalled();
    });

    it('publishInitialTracks stops both tracks and rethrows if the video publish fails, without ever attempting to publish audio', async () => {
      const room = attachFakeRoom();
      const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as LocalVideoTrack;
      const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as LocalAudioTrack;
      fixture.componentRef.setInput('initialVideoTrack', fakeVideoTrack);
      fixture.componentRef.setInput('initialAudioTrack', fakeAudioTrack);
      room.localParticipant.publishTrack = jasmine.createSpy('publishTrack').and.rejectWith(new Error('video publish failed'));

      let thrown: unknown;
      try {
        await component.publishInitialTracks(room as never);
      } catch (err) {
        thrown = err;
      }

      expect(thrown).toBeDefined();
      expect(fakeVideoTrack.stop).toHaveBeenCalled();
      expect(fakeAudioTrack.stop).toHaveBeenCalled();
      expect(component.cameraIsEnable()).toBe(false);
      expect(room.localParticipant.publishTrack).toHaveBeenCalledTimes(1);
    });

    it('publishInitialTracks stops only the audio track if it fails to publish, leaving an already-published video track for the room to own', async () => {
      const room = attachFakeRoom();
      const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as LocalVideoTrack;
      const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as LocalAudioTrack;
      room.videoTrackPublications.set('cam', { source: 'camera', kind: 'video', videoTrack: fakeVideoTrack });
      fixture.componentRef.setInput('initialVideoTrack', fakeVideoTrack);
      fixture.componentRef.setInput('initialAudioTrack', fakeAudioTrack);
      room.localParticipant.publishTrack = jasmine.createSpy('publishTrack').and.callFake((track: unknown) => {
        if (track === fakeAudioTrack) {
          return Promise.reject(new Error('audio publish failed'));
        }
        return Promise.resolve(undefined);
      });

      let thrown: unknown;
      try {
        await component.publishInitialTracks(room as never);
      } catch (err) {
        thrown = err;
      }

      expect(thrown).toBeDefined();
      expect(component.cameraIsEnable()).toBe(true);
      expect(fakeVideoTrack.stop).not.toHaveBeenCalled();
      expect(fakeAudioTrack.stop).toHaveBeenCalled();
      expect(component.microphoneEnabled()).toBe(false);
    });
  });

  describe('device switching', () => {
    it('switchVideoDevice calls room.switchActiveDevice and re-reads the published camera track', async () => {
      const room = attachFakeRoom();
      const freshTrack = { sid: 'v2' } as unknown as LocalVideoTrack;
      room.videoTrackPublications.set('cam', { source: 'camera', kind: 'video', videoTrack: freshTrack });

      await component.switchVideoDevice('cam-b');

      expect(room.switchActiveDevice).toHaveBeenCalledWith('videoinput', 'cam-b');
      expect(component.selectedVideoDeviceId()).toBe('cam-b');
      expect(component.localCameraTrack()).toBe(freshTrack);
      expect(component.localTrack()).toBe(freshTrack);
    });

    it('switchVideoDevice is a no-op when there is no room yet', async () => {
      await component.switchVideoDevice('cam-b');

      expect(component.selectedVideoDeviceId()).toBeUndefined();
    });

    it('switchAudioDevice calls room.switchActiveDevice', async () => {
      const room = attachFakeRoom();

      await component.switchAudioDevice('mic-b');

      expect(room.switchActiveDevice).toHaveBeenCalledWith('audioinput', 'mic-b');
      expect(component.selectedAudioDeviceId()).toBe('mic-b');
    });

    it('switchAudioDevice is a no-op when there is no room yet', async () => {
      await component.switchAudioDevice('mic-b');

      expect(component.selectedAudioDeviceId()).toBeUndefined();
    });

    it('refreshDevices populates videoDevices/audioDevices via Room.getLocalDevices', async () => {
      const videoDeviceA = { deviceId: 'cam-a', kind: 'videoinput', label: 'Camera A' } as MediaDeviceInfo;
      const audioDeviceA = { deviceId: 'mic-a', kind: 'audioinput', label: 'Mic A' } as MediaDeviceInfo;
      spyOn(Room, 'getLocalDevices').and.callFake((kind?: MediaDeviceKind) =>
        Promise.resolve(kind === 'videoinput' ? [videoDeviceA] : [audioDeviceA]));

      await component.refreshDevices();

      expect(component.videoDevices()).toEqual([videoDeviceA]);
      expect(component.audioDevices()).toEqual([audioDeviceA]);
    });

    it('publishInitialTracks seeds selected device ids from the published tracks and refreshes the device lists', async () => {
      const room = attachFakeRoom();
      const fakeVideoTrack = { mediaStreamTrack: { getSettings: () => ({ deviceId: 'cam-a' }) } } as unknown as LocalVideoTrack;
      const fakeAudioTrack = { mediaStreamTrack: { getSettings: () => ({ deviceId: 'mic-a' }) } } as unknown as LocalAudioTrack;
      fixture.componentRef.setInput('initialVideoTrack', fakeVideoTrack);
      fixture.componentRef.setInput('initialAudioTrack', fakeAudioTrack);
      const videoDeviceA = { deviceId: 'cam-a', kind: 'videoinput', label: 'Camera A' } as MediaDeviceInfo;
      spyOn(Room, 'getLocalDevices').and.callFake((kind?: MediaDeviceKind) =>
        Promise.resolve(kind === 'videoinput' ? [videoDeviceA] : []));

      await component.publishInitialTracks(room as never);

      expect(component.selectedVideoDeviceId()).toBe('cam-a');
      expect(component.selectedAudioDeviceId()).toBe('mic-a');
      expect(component.videoDevices()).toEqual([videoDeviceA]);
    });

    it('removes the devicechange listener on destroy', () => {
      const removeSpy = spyOn(navigator.mediaDevices, 'removeEventListener').and.callThrough();

      component.ngOnDestroy();

      expect(removeSpy).toHaveBeenCalledWith('devicechange', jasmine.any(Function));
    });
  });

  describe('raise hand', () => {
    it('toggleRaiseHand broadcasts hand-raised and adds self to the list', () => {
      const room = attachFakeRoom();

      component.toggleRaiseHand();

      expect(component.ownHandRaised()).toBe(true);
      expect(room.localParticipant.publishData).toHaveBeenCalledTimes(1);
      const [payload, options] = room.localParticipant.publishData.calls.mostRecent().args;
      expect(JSON.parse(new TextDecoder().decode(payload as Uint8Array))).toEqual({ type: 'hand-raised' });
      expect(options).toEqual({ reliable: true });
      expect(component.handsRaised().map((entry) => entry.identity)).toEqual(['ada-host']);
    });

    it('toggling again broadcasts hand-lowered and removes self from the list', () => {
      const room = attachFakeRoom();
      component.toggleRaiseHand();

      component.toggleRaiseHand();

      expect(component.ownHandRaised()).toBe(false);
      const [payload] = room.localParticipant.publishData.calls.mostRecent().args;
      expect(JSON.parse(new TextDecoder().decode(payload as Uint8Array))).toEqual({ type: 'hand-lowered' });
      expect(component.handsRaised()).toEqual([]);
    });

    it('toggleRaiseHand is a no-op when there is no room', () => {
      component.toggleRaiseHand();

      expect(component.ownHandRaised()).toBe(false);
    });

    it('a remote hand-raised message adds that participant to the list, in raise order', () => {
      const room = attachFakeRoom();

      fireData(room, { type: 'hand-raised' }, { identity: 'bob', name: 'Bob' });
      fireData(room, { type: 'hand-raised' }, { identity: 'carol', name: 'Carol' });

      expect(component.handsRaised().map((entry) => entry.name)).toEqual(['Bob', 'Carol']);
    });

    it('a remote hand-lowered message removes that participant', () => {
      const room = attachFakeRoom();
      fireData(room, { type: 'hand-raised' }, { identity: 'bob', name: 'Bob' });

      fireData(room, { type: 'hand-lowered' }, { identity: 'bob', name: 'Bob' });

      expect(component.handsRaised()).toEqual([]);
    });

    it('a duplicate hand-raised message from the same participant does not add them twice', () => {
      const room = attachFakeRoom();

      fireData(room, { type: 'hand-raised' }, { identity: 'bob', name: 'Bob' });
      fireData(room, { type: 'hand-raised' }, { identity: 'bob', name: 'Bob' });

      expect(component.handsRaised().length).toBe(1);
    });

    it('does not treat a hand-raised/hand-lowered message as a chat message', () => {
      const room = attachFakeRoom();

      fireData(room, { type: 'hand-raised' }, { identity: 'bob', name: 'Bob' });

      expect(component.messages()).toEqual([]);
    });

    it('re-broadcasts hand-raised when a new participant connects, if the hand is currently raised', () => {
      const room = attachFakeRoom();
      component.toggleRaiseHand();
      (room.localParticipant.publishData as jasmine.Spy).calls.reset();

      room.handlers.get(RoomEvent.ParticipantConnected)!({ identity: 'dave', name: 'Dave' });

      expect(room.localParticipant.publishData).toHaveBeenCalledTimes(1);
      const [payload] = (room.localParticipant.publishData as jasmine.Spy).calls.mostRecent().args;
      expect(JSON.parse(new TextDecoder().decode(payload as Uint8Array))).toEqual({ type: 'hand-raised' });
    });

    it('does not re-broadcast on a new participant connecting if no hand is raised', () => {
      const room = attachFakeRoom();

      room.handlers.get(RoomEvent.ParticipantConnected)!({ identity: 'dave', name: 'Dave' });

      expect(room.localParticipant.publishData).not.toHaveBeenCalled();
    });

    it('removes a participant from the raised-hands list when they disconnect', () => {
      const room = attachFakeRoom();
      fireData(room, { type: 'hand-raised' }, { identity: 'bob', name: 'Bob' });

      room.handlers.get(RoomEvent.ParticipantDisconnected)!({ identity: 'bob', name: 'Bob' });

      expect(component.handsRaised()).toEqual([]);
    });

    it('isHandRaised reflects whether a given identity is currently in the list', () => {
      const room = attachFakeRoom();
      fireData(room, { type: 'hand-raised' }, { identity: 'bob', name: 'Bob' });

      expect(component.isHandRaised('bob')).toBe(true);
      expect(component.isHandRaised('carol')).toBe(false);
    });

    it('leaveRoom clears the raised-hands list and resets ownHandRaised', async () => {
      attachFakeRoom();
      component.toggleRaiseHand();

      await component.leaveRoom();

      expect(component.handsRaised()).toEqual([]);
      expect(component.ownHandRaised()).toBe(false);
    });
  });

  describe('in-call background effect', () => {
    it('setBackgroundEffect(blur) applies a BackgroundProcessor to the local camera track', async () => {
      attachFakeRoom();
      const cameraTrack = {
        setProcessor: jasmine.createSpy('setProcessor').and.resolveTo(undefined),
      } as unknown as LocalVideoTrack;
      component.localCameraTrack.set(cameraTrack);
      const fakeProcessor = {} as trackProcessors.BackgroundProcessorWrapper;
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue(fakeProcessor);

      await component.setBackgroundEffect('blur');

      expect(trackProcessors.BackgroundProcessor).toHaveBeenCalledWith({ mode: 'background-blur', blurRadius: 10 });
      expect(cameraTrack.setProcessor).toHaveBeenCalledWith(fakeProcessor);
      expect(component.backgroundEffect()).toBe('blur');
    });

    it('setBackgroundEffect(image, path) applies a virtual-background processor and remembers the path', async () => {
      attachFakeRoom();
      const cameraTrack = {
        setProcessor: jasmine.createSpy('setProcessor').and.resolveTo(undefined),
      } as unknown as LocalVideoTrack;
      component.localCameraTrack.set(cameraTrack);
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);
      const preset = BACKGROUND_IMAGE_PRESETS[0];

      await component.setBackgroundEffect('image', preset.path);

      expect(trackProcessors.BackgroundProcessor).toHaveBeenCalledWith({ mode: 'virtual-background', imagePath: preset.path });
      expect(component.backgroundEffect()).toBe('image');
      expect(component.selectedBackgroundImage()).toBe(preset.path);
    });

    it('setBackgroundEffect(none) stops the processor and clears state', async () => {
      attachFakeRoom();
      const cameraTrack = {
        stopProcessor: jasmine.createSpy('stopProcessor').and.resolveTo(undefined),
      } as unknown as LocalVideoTrack;
      component.localCameraTrack.set(cameraTrack);
      component.backgroundEffect.set('blur');

      await component.setBackgroundEffect('none');

      expect(cameraTrack.stopProcessor).toHaveBeenCalled();
      expect(component.backgroundEffect()).toBe('none');
      expect(component.selectedBackgroundImage()).toBeUndefined();
    });

    it('setBackgroundEffect is a no-op when there is no local camera track', async () => {
      await component.setBackgroundEffect('blur');

      expect(component.backgroundEffect()).toBe('none');
    });

    it('falls back to none and marks the effect unavailable when applying the processor throws', async () => {
      attachFakeRoom();
      const cameraTrack = {
        setProcessor: jasmine.createSpy('setProcessor').and.rejectWith(new Error('no worker support')),
      } as unknown as LocalVideoTrack;
      component.localCameraTrack.set(cameraTrack);
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);

      await component.setBackgroundEffect('blur');

      expect(component.backgroundEffect()).toBe('none');
      expect(component.backgroundUnavailable()).toBe(true);
    });

    it('onBackgroundEffectChange applies blur directly', () => {
      attachFakeRoom();
      const cameraTrack = {
        setProcessor: jasmine.createSpy('setProcessor').and.resolveTo(undefined),
      } as unknown as LocalVideoTrack;
      component.localCameraTrack.set(cameraTrack);
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);

      component.onBackgroundEffectChange({ value: 'blur' } as never);

      expect(trackProcessors.BackgroundProcessor).toHaveBeenCalledWith({ mode: 'background-blur', blurRadius: 10 });
    });

    it('onBackgroundEffectChange defaults to the first preset when switching to image with none previously selected', () => {
      attachFakeRoom();
      const cameraTrack = {
        setProcessor: jasmine.createSpy('setProcessor').and.resolveTo(undefined),
      } as unknown as LocalVideoTrack;
      component.localCameraTrack.set(cameraTrack);
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);

      component.onBackgroundEffectChange({ value: 'image' } as never);

      expect(trackProcessors.BackgroundProcessor).toHaveBeenCalledWith({ mode: 'virtual-background', imagePath: BACKGROUND_IMAGE_PRESETS[0].path });
    });

    it('selectBackgroundImage applies a virtual-background processor for the chosen preset', () => {
      attachFakeRoom();
      const cameraTrack = {
        setProcessor: jasmine.createSpy('setProcessor').and.resolveTo(undefined),
      } as unknown as LocalVideoTrack;
      component.localCameraTrack.set(cameraTrack);
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);
      const preset = BACKGROUND_IMAGE_PRESETS[1];

      component.selectBackgroundImage(preset.path);

      expect(trackProcessors.BackgroundProcessor).toHaveBeenCalledWith({ mode: 'virtual-background', imagePath: preset.path });
    });

    it('publishInitialTracks seeds backgroundEffect/selectedBackgroundImage from the initial* inputs', async () => {
      const room = attachFakeRoom();
      const preset = BACKGROUND_IMAGE_PRESETS[0];
      fixture.componentRef.setInput('initialBackgroundEffect', 'image');
      fixture.componentRef.setInput('initialBackgroundImage', preset.path);

      await component.publishInitialTracks(room as never);

      expect(component.backgroundEffect()).toBe('image');
      expect(component.selectedBackgroundImage()).toBe(preset.path);
    });

    it('reapplies the active background effect when LiveKit republishes a new camera track (e.g. after a device switch)', () => {
      const room = attachFakeRoom();
      component.backgroundEffect.set('blur');
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);
      const freshTrack = {
        setProcessor: jasmine.createSpy('setProcessor').and.resolveTo(undefined),
      } as unknown as LocalVideoTrack;

      room.handlers.get(RoomEvent.LocalTrackPublished)!({ kind: 'video', source: 'camera', videoTrack: freshTrack });

      expect(freshTrack.setProcessor).toHaveBeenCalled();
    });

    it('does not reapply anything on a new camera publication when no background effect is active', () => {
      const room = attachFakeRoom();
      const freshTrack = {
        setProcessor: jasmine.createSpy('setProcessor'),
      } as unknown as LocalVideoTrack;

      room.handlers.get(RoomEvent.LocalTrackPublished)!({ kind: 'video', source: 'camera', videoTrack: freshTrack });

      expect(freshTrack.setProcessor).not.toHaveBeenCalled();
    });

    it('leaveRoom resets the background effect state', async () => {
      attachFakeRoom();
      component.backgroundEffect.set('blur');
      component.selectedBackgroundImage.set(BACKGROUND_IMAGE_PRESETS[0].path);

      await component.leaveRoom();

      expect(component.backgroundEffect()).toBe('none');
      expect(component.selectedBackgroundImage()).toBeUndefined();
    });
  });
});
