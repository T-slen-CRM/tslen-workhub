import { Injectable, signal } from '@angular/core';
import { LocalAudioTrack, LocalVideoTrack } from 'livekit-client';

export interface ActiveMeetingCall {
  livekitToken: string;
  roomName: string;
  displayName: string;
  videoTrack: LocalVideoTrack | undefined;
  audioTrack: LocalAudioTrack | undefined;
}

/**
 * Holds the host's active meeting-link call across route navigation, the
 * same role LiveChatService's activeCallData plays for the 1:1 call:
 * AdminComponent (the persistent shell wrapping every routed page) reads
 * this signal and renders <app-meeting-room> as an overlay sibling to
 * <router-outlet>, so the call survives navigating to a different page
 * instead of being destroyed with whatever route started it.
 */
@Injectable({ providedIn: 'root' })
export class ActiveMeetingCallService {
  private readonly _activeCall = signal<ActiveMeetingCall | null>(null);
  readonly activeCall = this._activeCall.asReadonly();

  start (call: ActiveMeetingCall): void {
    this._activeCall.set(call);
  }

  clear (): void {
    this._activeCall.set(null);
  }
}
