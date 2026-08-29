import { TestBed } from '@angular/core/testing';
import { LocalAudioTrack, LocalVideoTrack } from 'livekit-client';
import { ActiveMeetingCall, ActiveMeetingCallService } from './active-meeting-call.service';

describe('ActiveMeetingCallService', () => {
  let service: ActiveMeetingCallService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ActiveMeetingCallService);
  });

  it('starts with no active call', () => {
    expect(service.activeCall()).toBeNull();
  });

  it('start sets the active call', () => {
    const call: ActiveMeetingCall = {
      livekitToken: 'jwt',
      roomName: 'meeting-abc',
      displayName: 'Ada',
      videoTrack: { sid: 'v1' } as unknown as LocalVideoTrack,
      audioTrack: { sid: 'a1' } as unknown as LocalAudioTrack,
      backgroundEffect: 'none',
      backgroundImage: undefined,
    };

    service.start(call);

    expect(service.activeCall()).toBe(call);
  });

  it('clear resets to null', () => {
    service.start({
      livekitToken: 'jwt',
      roomName: 'meeting-abc',
      displayName: 'Ada',
      videoTrack: undefined,
      audioTrack: undefined,
      backgroundEffect: 'none',
      backgroundImage: undefined,
    });

    service.clear();

    expect(service.activeCall()).toBeNull();
  });
});
