import { Component, OnDestroy, OnInit, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { CollapsibleCallWindowDirective } from '../pages/live-kit/collapsible-call-window.directive';
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
import { BackgroundProcessor } from '@livekit/track-processors';
import { VideoComponent } from '../pages/call/video/video.component';
import { AudioComponent } from '../pages/call/audio/audio.component';
import { MeetingChatComponent, MeetingChatMessage } from './meeting-chat/meeting-chat.component';
import { RaisedHandEntry, RaisedHandsPanelComponent } from './raised-hands-panel/raised-hands-panel.component';
import { BACKGROUND_IMAGE_PRESETS, BackgroundEffect } from './pre-join-lobby/pre-join-lobby.component';
import { environment } from '../../environments/environment';

interface TrackInfo {
  trackPublication: RemoteTrackPublication;
  participantIdentity: string;
}

@Component({
  selector: 'app-meeting-room',
  standalone: true,
  imports: [DragDropModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatIconModule, MatSelectModule, MatTooltipModule, TranslateModule, VideoComponent, AudioComponent, MeetingChatComponent, RaisedHandsPanelComponent, CollapsibleCallWindowDirective],
  templateUrl: './meeting-room.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./meeting-room.component.css', '../pages/live-kit/collapsible-call-window.css'],
})
export class MeetingRoomComponent implements OnInit, OnDestroy {
  livekitToken = input.required<string>();
  roomName = input.required<string>();
  displayName = input.required<string>();
  initialVideoTrack = input<LocalVideoTrack | undefined>(undefined);
  initialAudioTrack = input<LocalAudioTrack | undefined>(undefined);
  // What the pre-join lobby already baked into initialVideoTrack's processor -
  // purely to seed this component's own picker's displayed state; the lobby
  // has already applied the actual effect to the track itself.
  initialBackgroundEffect = input<BackgroundEffect>('none');
  initialBackgroundImage = input<string | undefined>(undefined);
  leaveRoomOutput = output();

  room = signal<Room | undefined>(undefined);
  localCameraTrack = signal<LocalVideoTrack | undefined>(undefined);
  localScreenTrack = signal<LocalVideoTrack | undefined>(undefined);
  localTrack = signal<LocalVideoTrack | undefined>(undefined);
  remoteTracksMap = signal<Map<string, TrackInfo>>(new Map());
  cameraIsEnable = signal<boolean>(false);
  microphoneEnabled = signal<boolean>(false);
  screenShareEnabled = signal<boolean>(false);
  chatOpen = signal<boolean>(false);
  messages = signal<MeetingChatMessage[]>([]);
  raisedHandsPanelOpen = signal<boolean>(false);
  handsRaised = signal<RaisedHandEntry[]>([]);
  ownHandRaised = signal<boolean>(false);
  videoDevices = signal<MediaDeviceInfo[]>([]);
  audioDevices = signal<MediaDeviceInfo[]>([]);
  selectedVideoDeviceId = signal<string | undefined>(undefined);
  selectedAudioDeviceId = signal<string | undefined>(undefined);
  backgroundPanelOpen = signal<boolean>(false);
  backgroundEffect = signal<BackgroundEffect>('none');
  selectedBackgroundImage = signal<string | undefined>(undefined);
  backgroundUnavailable = signal<boolean>(false);
  backgroundImagePresets = BACKGROUND_IMAGE_PRESETS;

  private destroyed = false;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  private handleDeviceChange = (): void => {
    void this.refreshDevices();
  };

  private onDataReceived = (payload: Uint8Array, participant?: RemoteParticipant): void => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(this.decoder.decode(payload));
    } catch {
      // Ignore a malformed payload from a misbehaving client - never crash the chat over it.
      return;
    }
    const type = (parsed as { type?: unknown } | null)?.type;
    if (type === 'hand-raised' || type === 'hand-lowered') {
      this.applyHandRaiseEvent(type, participant);
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

  private applyHandRaiseEvent (type: 'hand-raised' | 'hand-lowered', participant?: RemoteParticipant): void {
    if (!participant) {
      return;
    }
    const identity = participant.identity;
    if (type === 'hand-raised') {
      this.handsRaised.update((list) => (
        list.some((entry) => entry.identity === identity)
          ? list
          : [...list, { identity, name: participant.name || identity, ts: Date.now() }]
      ));
    } else {
      this.handsRaised.update((list) => list.filter((entry) => entry.identity !== identity));
    }
  }

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
    } catch {
      // Neither lobby-provided track was ever handed to the room, so
      // leaveRoom()'s disconnect() won't stop them - do it explicitly.
      this.stopUnpublishedInitialTracks();
      await this.leaveRoom();
      return;
    }

    try {
      await this.publishInitialTracks(room);
    } catch {
      await this.leaveRoom();
      return;
    }

    navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange);
  }

  stopUnpublishedInitialTracks (): void {
    this.initialVideoTrack()?.stop();
    this.initialAudioTrack()?.stop();
  }

  async publishInitialTracks (room: Room): Promise<void> {
    const videoTrack = this.initialVideoTrack();
    if (videoTrack) {
      try {
        await room.localParticipant.publishTrack(videoTrack);
      } catch (err) {
        videoTrack.stop();
        this.initialAudioTrack()?.stop();
        throw err;
      }
      this.cameraIsEnable.set(true);
      this.selectedVideoDeviceId.set(videoTrack.mediaStreamTrack?.getSettings().deviceId);
      const cameraTrack = this.findLocalVideoTrack(room, 'camera');
      if (cameraTrack) {
        this.localCameraTrack.set(cameraTrack);
        this.localTrack.set(cameraTrack);
      }
    }
    const audioTrack = this.initialAudioTrack();
    if (audioTrack) {
      try {
        await room.localParticipant.publishTrack(audioTrack);
      } catch (err) {
        audioTrack.stop();
        throw err;
      }
      this.microphoneEnabled.set(true);
      this.selectedAudioDeviceId.set(audioTrack.mediaStreamTrack?.getSettings().deviceId);
    }
    await this.refreshDevices();
    // Seeds this component's own picker to reflect what the lobby already
    // applied to the track's processor - done last, after the track is
    // already published, so the LocalTrackPublished handler below (which
    // reapplies whenever backgroundEffect is non-'none') doesn't fire a
    // redundant re-application against the very same processor on first join.
    this.backgroundEffect.set(this.initialBackgroundEffect());
    this.selectedBackgroundImage.set(this.initialBackgroundImage());
  }

  async switchVideoDevice (deviceId: string): Promise<void> {
    const room = this.room();
    if (!room) {
      return;
    }
    this.selectedVideoDeviceId.set(deviceId);
    await room.switchActiveDevice('videoinput', deviceId);
    const cameraTrack = this.findLocalVideoTrack(room, 'camera');
    if (cameraTrack) {
      this.localCameraTrack.set(cameraTrack);
      if (!this.screenShareEnabled()) {
        this.localTrack.set(cameraTrack);
      }
    }
  }

  async switchAudioDevice (deviceId: string): Promise<void> {
    const room = this.room();
    if (!room) {
      return;
    }
    this.selectedAudioDeviceId.set(deviceId);
    await room.switchActiveDevice('audioinput', deviceId);
  }

  async refreshDevices (): Promise<void> {
    try {
      const [videoDevices, audioDevices] = await Promise.all([
        Room.getLocalDevices('videoinput'),
        Room.getLocalDevices('audioinput'),
      ]);
      if (this.destroyed) {
        return;
      }
      this.videoDevices.set(videoDevices);
      this.audioDevices.set(audioDevices);
    } catch {
      // Device enumeration is a nice-to-have; leave whatever list we already have.
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
        // LiveKit hands out a brand-new LocalVideoTrack (with no processor of
        // its own) on every device switch and every disable/re-enable cycle -
        // reapply whatever background effect is currently selected so it
        // survives those, instead of silently reverting to the raw camera feed.
        if (this.backgroundEffect() !== 'none' && publication.videoTrack) {
          void this.setBackgroundEffect(this.backgroundEffect(), this.selectedBackgroundImage());
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

    // A participant who joins after others already raised their hand never
    // saw those earlier (unreplayed) data-channel messages - so whoever
    // currently has a hand raised re-sends their own state once per new
    // arrival, keeping every client's queue consistent for latecomers.
    room.on(RoomEvent.ParticipantConnected, () => {
      if (!this.ownHandRaised()) {
        return;
      }
      this.room()?.localParticipant.publishData(this.encoder.encode(JSON.stringify({ type: 'hand-raised' })), { reliable: true });
    });
    room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      this.handsRaised.update((list) => list.filter((entry) => entry.identity !== participant.identity));
    });
  }

  toggleRaiseHand (): void {
    const room = this.room();
    if (!room) {
      return;
    }
    const nextValue = !this.ownHandRaised();
    this.ownHandRaised.set(nextValue);
    room.localParticipant.publishData(
      this.encoder.encode(JSON.stringify({ type: nextValue ? 'hand-raised' : 'hand-lowered' })),
      { reliable: true },
    );
    const identity = room.localParticipant.identity;
    if (nextValue) {
      this.handsRaised.update((list) => (
        list.some((entry) => entry.identity === identity)
          ? list
          : [...list, { identity, name: this.displayName(), ts: Date.now() }]
      ));
    } else {
      this.handsRaised.update((list) => list.filter((entry) => entry.identity !== identity));
    }
  }

  isHandRaised (identity: string): boolean {
    return this.handsRaised().some((entry) => entry.identity === identity);
  }

  onBackgroundEffectChange (change: MatButtonToggleChange): void {
    const value = change.value as BackgroundEffect;
    if (value === 'image') {
      void this.setBackgroundEffect('image', this.selectedBackgroundImage() ?? BACKGROUND_IMAGE_PRESETS[0].path);
    } else {
      void this.setBackgroundEffect(value);
    }
  }

  selectBackgroundImage (path: string): void {
    void this.setBackgroundEffect('image', path);
  }

  async setBackgroundEffect (effect: BackgroundEffect, imagePath?: string): Promise<void> {
    const track = this.localCameraTrack();
    if (!track) {
      return;
    }
    if (effect === 'none') {
      await track.stopProcessor();
      this.backgroundEffect.set('none');
      this.selectedBackgroundImage.set(undefined);
      return;
    }
    try {
      const processor = effect === 'blur'
        ? BackgroundProcessor({ mode: 'background-blur', blurRadius: 10 })
        : BackgroundProcessor({ mode: 'virtual-background', imagePath: imagePath! });
      await track.setProcessor(processor);
      this.backgroundEffect.set(effect);
      this.selectedBackgroundImage.set(effect === 'image' ? imagePath : undefined);
      this.backgroundUnavailable.set(false);
    } catch {
      this.backgroundEffect.set('none');
      this.selectedBackgroundImage.set(undefined);
      this.backgroundUnavailable.set(true);
    }
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
    this.handsRaised.set([]);
    this.ownHandRaised.set(false);
    this.backgroundEffect.set('none');
    this.selectedBackgroundImage.set(undefined);
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
    navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChange);
    this.leaveRoom();
  }
}
