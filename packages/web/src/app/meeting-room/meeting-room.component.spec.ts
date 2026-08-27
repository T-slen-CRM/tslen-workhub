import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RoomEvent } from 'livekit-client';
import { MeetingRoomComponent } from './meeting-room.component';

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
    // TestBed's automatic fixture teardown calls ngOnDestroy -> leaveRoom() after every test,
    // so any fake room installed via component.room.set(...) needs a disconnect stub too.
    disconnect: jasmine.createSpy('disconnect').and.resolveTo(undefined),
    localParticipant: {
      videoTrackPublications,
      setCameraEnabled: jasmine.createSpy('setCameraEnabled').and.resolveTo(undefined),
      setMicrophoneEnabled: jasmine.createSpy('setMicrophoneEnabled').and.resolveTo(undefined),
      setScreenShareEnabled: jasmine.createSpy('setScreenShareEnabled').and.resolveTo(undefined),
      publishData: jasmine.createSpy('publishData'),
    },
  };
}

function fireData (room: FakeRoom, payload: unknown, participant?: { name?: string; identity?: string }): void {
  const handler = room.handlers.get(RoomEvent.DataReceived)!;
  handler(new TextEncoder().encode(JSON.stringify(payload)), participant);
}

describe('MeetingRoomComponent', () => {
  let component: MeetingRoomComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MeetingRoomComponent, TranslateModule.forRoot()],
    });

    const fixture = TestBed.createComponent(MeetingRoomComponent);
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
});
