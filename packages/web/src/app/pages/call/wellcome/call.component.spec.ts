import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LocalAudioTrack, LocalVideoTrack, Room, RoomEvent } from 'livekit-client';
import { CallComponent } from './call.component';
import { PictureInPictureHandles } from '../../live-kit/picture-in-picture.service';
import { AuthenticationService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';

type FakeRoom = ReturnType<typeof createFakeRoom>;

/**
 * A stand-in for a LiveKit `Room` that records the handlers the component
 * registers, so a spec can drive `RoomEvent.*` the way the real SDK would.
 * Mirrors meeting-room.component.spec.ts's fake, since CallComponent now
 * reuses the same device-switching/raise-hand/chat wiring.
 */
function createFakeRoom() {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const videoTrackPublications = new Map<string, unknown>();
  const audioTrackPublications = new Map<string, unknown>();

  return {
    handlers,
    videoTrackPublications,
    audioTrackPublications,
    on: jasmine.createSpy('on').and.callFake((event: string, cb: (...args: unknown[]) => void) => {
      handlers.set(event, cb);
    }),
    off: jasmine.createSpy('off'),
    connect: jasmine.createSpy('connect').and.resolveTo(undefined),
    switchActiveDevice: jasmine.createSpy('switchActiveDevice').and.resolveTo(true),
    disconnect: jasmine.createSpy('disconnect').and.resolveTo(undefined),
    localParticipant: {
      identity: 'caller-5',
      videoTrackPublications,
      audioTrackPublications,
      setCameraEnabled: jasmine.createSpy('setCameraEnabled').and.resolveTo(undefined),
      setMicrophoneEnabled: jasmine.createSpy('setMicrophoneEnabled').and.resolveTo(undefined),
      setScreenShareEnabled: jasmine.createSpy('setScreenShareEnabled').and.resolveTo(undefined),
      publishData: jasmine.createSpy('publishData'),
    },
  };
}

function fireData(room: FakeRoom, payload: unknown, participant?: { name?: string; identity?: string }): void {
  const handler = room.handlers.get(RoomEvent.DataReceived)!;
  handler(new TextEncoder().encode(JSON.stringify(payload)), participant);
}

type DataReceivedHandler = (payload: Uint8Array, participant?: { name?: string; identity?: string }) => void;

describe('CallComponent', () => {
  let component: CallComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CallComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AuthenticationService, useValue: { authDataSignal: () => ({ id: 1, firstName: 'A', lastName: 'B' }) } },
        { provide: DataService, useValue: {} },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    });

    const fixture = TestBed.createComponent(CallComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('callerId', 5);
    // calleeId is left at its default (null) on purpose.
  });

  /**
   * Installs a fake room directly, without going through joinRoom(), and
   * wires up the DataReceived listener the way joinRoom() would (CallComponent
   * doesn't expose a separate registerRoomEventHandlers() the way
   * MeetingRoomComponent does - its room.on(...) calls live inline in joinRoom()).
   */
  function attachFakeRoom(): FakeRoom {
    const room = createFakeRoom();
    component.room.set(room as never);
    room.on(RoomEvent.DataReceived, (component as unknown as { onDataReceived: DataReceivedHandler }).onDataReceived);
    return room;
  }

  it('does not join a room when calleeId is missing, even though callerId is set', () => {
    const joinRoomSpy = spyOn(component, 'joinRoom');

    component.ngOnInit();

    expect(joinRoomSpy).not.toHaveBeenCalled();
  });

  it('popOutToPictureInPicture opens the PiP window with handles bound to this call', () => {
    const openSpy = spyOn((component as any).pip, 'open');
    const mainTrack = {} as any;
    spyOn(component, 'getCurrentMainVideoTrack').and.returnValue(mainTrack);

    component.popOutToPictureInPicture();

    expect(openSpy).toHaveBeenCalledTimes(1);
    const handles = openSpy.calls.mostRecent().args[0] as PictureInPictureHandles;
    expect(handles.getMainVideoTrack()).toBe(mainTrack);
    expect(handles.isMicEnabled()).toBe(component.microphoneEnabled());
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

    it('refreshDevices populates videoDevices/audioDevices via Room.getLocalDevices', async () => {
      const videoDeviceA = { deviceId: 'cam-a', kind: 'videoinput', label: 'Camera A' } as MediaDeviceInfo;
      const audioDeviceA = { deviceId: 'mic-a', kind: 'audioinput', label: 'Mic A' } as MediaDeviceInfo;
      spyOn(Room, 'getLocalDevices').and.callFake((kind?: MediaDeviceKind) =>
        Promise.resolve(kind === 'videoinput' ? [videoDeviceA] : [audioDeviceA]));

      await component.refreshDevices();

      expect(component.videoDevices()).toEqual([videoDeviceA]);
      expect(component.audioDevices()).toEqual([audioDeviceA]);
    });

    it('setCameraEnabled(true) seeds selectedVideoDeviceId from the published track', async () => {
      const room = attachFakeRoom();
      const cameraTrack = {
        mediaStreamTrack: { getSettings: () => ({ deviceId: 'cam-a' }) },
      } as unknown as LocalVideoTrack;
      room.videoTrackPublications.set('cam', { source: 'camera', kind: 'video', videoTrack: cameraTrack });
      spyOn(component, 'refreshDevices').and.resolveTo(undefined);

      await component.setCameraEnabled(true);

      expect(component.selectedVideoDeviceId()).toBe('cam-a');
    });

    it('setMicrophoneEnabled(true) seeds selectedAudioDeviceId from the published track', async () => {
      const room = attachFakeRoom();
      const micTrack = {
        mediaStreamTrack: { getSettings: () => ({ deviceId: 'mic-a' }) },
      } as unknown as LocalAudioTrack;
      room.audioTrackPublications.set('mic', { source: 'microphone', kind: 'audio', audioTrack: micTrack });
      spyOn(component, 'refreshDevices').and.resolveTo(undefined);

      await component.setMicrophoneEnabled(true);

      expect(component.selectedAudioDeviceId()).toBe('mic-a');
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
      expect(component.handsRaised().map((entry) => entry.identity)).toEqual(['caller-5']);
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

  describe('chat', () => {
    it('sendChatMessage publishes over the data channel and appends it locally', () => {
      const room = attachFakeRoom();

      component.sendChatMessage('hello there');

      expect(room.localParticipant.publishData).toHaveBeenCalledTimes(1);
      const [payload, options] = room.localParticipant.publishData.calls.mostRecent().args;
      const decoded = JSON.parse(new TextDecoder().decode(payload as Uint8Array));
      expect(decoded.text).toBe('hello there');
      expect(options).toEqual({ reliable: true });
      expect(component.messages().length).toBe(1);
    });

    it('sendChatMessage ignores an empty or whitespace-only message', () => {
      const room = attachFakeRoom();

      component.sendChatMessage('   ');

      expect(room.localParticipant.publishData).not.toHaveBeenCalled();
      expect(component.messages()).toEqual([]);
    });

    it('keeps messages received while the chat panel is closed', () => {
      const room = attachFakeRoom();
      expect(component.chatOpen()).toBe(false);

      fireData(room, { text: 'hi' }, { identity: 'bob', name: 'Bob' });

      const messages = component.messages();
      expect(messages.length).toBe(1);
      expect(messages[0].senderName).toBe('Bob');
      expect(messages[0].text).toBe('hi');
    });

    it('does not treat a hand-raised/hand-lowered message as a chat message', () => {
      const room = attachFakeRoom();

      fireData(room, { type: 'hand-raised' }, { identity: 'bob', name: 'Bob' });

      expect(component.messages()).toEqual([]);
    });

    it('leaveRoom unregisters the DataReceived listener', async () => {
      const room = attachFakeRoom();

      await component.leaveRoom();

      expect(room.off).toHaveBeenCalledWith(RoomEvent.DataReceived, jasmine.any(Function));
    });
  });
});
