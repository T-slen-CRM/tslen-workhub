import { Component, OnDestroy, OnInit, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
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
import { VideoComponent } from '../pages/call/video/video.component';
import { AudioComponent } from '../pages/call/audio/audio.component';
import { MeetingChatComponent, MeetingChatMessage } from './meeting-chat/meeting-chat.component';
import { environment } from '../../environments/environment';

interface TrackInfo {
  trackPublication: RemoteTrackPublication;
  participantIdentity: string;
}

@Component({
  selector: 'app-meeting-room',
  standalone: true,
  imports: [NgClass, TranslateModule, VideoComponent, AudioComponent, MeetingChatComponent],
  templateUrl: './meeting-room.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './meeting-room.component.css',
})
export class MeetingRoomComponent implements OnInit, OnDestroy {
  livekitToken = input.required<string>();
  roomName = input.required<string>();
  displayName = input.required<string>();
  leaveRoomOutput = output();

  room = signal<Room | undefined>(undefined);
  localCameraTrack = signal<LocalVideoTrack | undefined>(undefined);
  localScreenTrack = signal<LocalVideoTrack | undefined>(undefined);
  localTrack = signal<LocalVideoTrack | undefined>(undefined);
  remoteTracksMap = signal<Map<string, TrackInfo>>(new Map());
  cameraIsEnable = signal<boolean>(false);
  microphoneEnabled = signal<boolean>(true);
  screenShareEnabled = signal<boolean>(false);
  chatOpen = signal<boolean>(false);
  messages = signal<MeetingChatMessage[]>([]);

  private destroyed = false;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  private onDataReceived = (payload: Uint8Array, participant?: RemoteParticipant): void => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(this.decoder.decode(payload));
    } catch {
      // Ignore a malformed payload from a misbehaving client - never crash the chat over it.
      return;
    }
    const text = (parsed as { text?: unknown } | null)?.text;
    if (typeof text !== 'string' || !text.trim()) {
      // Missing/blank/non-string body - drop it rather than render `undefined`.
      return;
    }
    // The display name comes from LiveKit's own participant record, never from
    // the payload: anyone in the room can publish a payload claiming to be anyone.
    const senderName = participant?.name || participant?.identity || 'Unknown';
    this.messages.update((list) => [...list, { senderName, text, ts: Date.now() }]);
  };

  ngOnInit(): void {
    this.joinRoom();
  }

  async joinRoom(): Promise<void> {
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

  registerRoomEventHandlers(room: Room): void {
    // Signal equality is Object.is, so the map has to be COPIED before it is
    // mutated - returning the same reference reads as "no change" and OnPush
    // ancestors never repaint the grid.
    room.on(RoomEvent.TrackSubscribed, (_track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      this.remoteTracksMap.update((map) => {
        const next = new Map(map);
        next.set(publication.trackSid, { trackPublication: publication, participantIdentity: participant.identity });
        return next;
      });
    });
    room.on(RoomEvent.TrackUnsubscribed, (_track: RemoteTrack, publication: RemoteTrackPublication) => {
      this.remoteTracksMap.update((map) => {
        const next = new Map(map);
        next.delete(publication.trackSid);
        return next;
      });
    });

    // LiveKit replaces the underlying LocalVideoTrack on every enable/disable
    // cycle, so the local tile has to follow the publications it actually
    // reports rather than a reference cached at join time.
    room.on(RoomEvent.LocalTrackPublished, (publication: LocalTrackPublication) => {
      if (publication.kind !== 'video') {
        return;
      }
      if (publication.source === 'camera') {
        this.localCameraTrack.set(publication.videoTrack);
        if (!this.screenShareEnabled()) {
          this.localTrack.set(publication.videoTrack);
        }
      } else if (publication.source === 'screen_share') {
        this.localScreenTrack.set(publication.videoTrack);
        this.localTrack.set(publication.videoTrack);
        this.screenShareEnabled.set(true);
      }
    });
    room.on(RoomEvent.LocalTrackUnpublished, (publication: LocalTrackPublication) => {
      if (publication.kind !== 'video') {
        return;
      }
      if (publication.source === 'camera') {
        this.localCameraTrack.set(undefined);
        if (!this.screenShareEnabled()) {
          this.localTrack.set(undefined);
        }
      } else if (publication.source === 'screen_share') {
        this.localScreenTrack.set(undefined);
        this.screenShareEnabled.set(false);
        this.localTrack.set(this.localCameraTrack());
      }
    });

    room.on(RoomEvent.DataReceived, this.onDataReceived);
  }

  async leaveRoom(): Promise<void> {
    const room = this.room();
    room?.off(RoomEvent.DataReceived, this.onDataReceived);
    await room?.disconnect();
    this.room.set(undefined);
    this.localTrack.set(undefined);
    this.localCameraTrack.set(undefined);
    this.localScreenTrack.set(undefined);
    this.remoteTracksMap.set(new Map());
    this.messages.set([]);
    if (!this.destroyed) {
      this.leaveRoomOutput.emit();
    }
  }

  sendChatMessage(rawText: string): void {
    const text = rawText.trim();
    const room = this.room();
    if (!text || !room) {
      return;
    }
    // Only the body goes on the wire - receivers take the sender's name from
    // LiveKit's participant record, so shipping one here would be dead weight
    // that merely invites spoofing.
    room.localParticipant.publishData(this.encoder.encode(JSON.stringify({ text })), { reliable: true });
    this.messages.update((list) => [...list, { senderName: this.displayName(), text, ts: Date.now() }]);
  }

  async setCameraEnabled(value: boolean): Promise<void> {
    const room = this.room();
    if (!room) {
      return;
    }
    await room.localParticipant.setCameraEnabled(value);
    this.cameraIsEnable.set(value);
    // Disabling stops AND unpublishes the track; re-enabling creates a brand-new
    // LocalVideoTrack. Always re-read the current publication - re-attaching the
    // reference captured at join time renders a permanently black local tile.
    const cameraTrack = value ? this.findLocalVideoTrack(room, 'camera') : undefined;
    this.localCameraTrack.set(cameraTrack);
    if (!this.screenShareEnabled()) {
      this.localTrack.set(cameraTrack);
    }
  }

  async setMicrophoneEnabled(value: boolean): Promise<void> {
    const room = this.room();
    if (!room) {
      return;
    }
    await room.localParticipant.setMicrophoneEnabled(value);
    this.microphoneEnabled.set(value);
  }

  async setScreenShareEnabled(value: boolean): Promise<void> {
    const room = this.room();
    if (!room) {
      return;
    }
    await room.localParticipant.setScreenShareEnabled(value);
    this.screenShareEnabled.set(value);
    const screenTrack = value ? this.findLocalVideoTrack(room, 'screen_share') : undefined;
    this.localScreenTrack.set(screenTrack);
    // While sharing, the local tile shows the screen; otherwise it falls back to
    // whatever camera track is currently published (possibly none).
    this.localTrack.set(screenTrack ?? this.findLocalVideoTrack(room, 'camera'));
  }

  private findLocalVideoTrack(room: Room, source: 'camera' | 'screen_share'): LocalVideoTrack | undefined {
    return Array.from(room.localParticipant.videoTrackPublications.values())
      .find((pub: LocalTrackPublication) => pub.source === source)?.videoTrack;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.leaveRoom();
  }
}
