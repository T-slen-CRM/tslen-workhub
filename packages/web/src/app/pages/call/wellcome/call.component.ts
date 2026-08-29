import {
  Component,
  HostListener,
  input,
  OnDestroy,
  OnInit,
  signal,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  LocalVideoTrack,
  LogLevel,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  setLogLevel,
  VideoPresets,
  VideoTrack,
} from 'livekit-client';

import { lastValueFrom } from 'rxjs';
import { VideoComponent } from '../video/video.component';
import { AudioComponent } from '../audio/audio.component';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { AuthenticationService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';
import {
  PictureInPictureService,
  PictureInPictureHandles,
} from '../../live-kit/picture-in-picture.service';
import { CollapsibleCallWindowDirective } from '../../live-kit/collapsible-call-window.directive';
import { MeetingChatComponent, MeetingChatMessage } from '../../../meeting-room/meeting-chat/meeting-chat.component';
import { RaisedHandEntry, RaisedHandsPanelComponent } from '../../../meeting-room/raised-hands-panel/raised-hands-panel.component';

interface TrackInfo {
  trackPublication: RemoteTrackPublication;
  participantIdentity: string;
}

// When running OpenVidu locally, leave these variables empty
// For other deployment type, configure them with correct URLs depending on your deployment
let APPLICATION_SERVER_URL = '';
let LIVEKIT_URL = environment.livekitUrl;

// livekit-client defaults its own internal logger to `info`, which prints
// routine per-track/per-room lifecycle noise ("publishing track",
// "disconnect from room", etc.) on every call - raise it to `warn` so only
// actual problems show up.
setLogLevel(LogLevel.warn);
@Component({
  selector: 'app-live-kit-call',
  imports: [
    ReactiveFormsModule,
    VideoComponent,
    AudioComponent,
    NgClass,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    TranslateModule,
    DragDropModule,
    CollapsibleCallWindowDirective,
    MeetingChatComponent,
    RaisedHandsPanelComponent,
  ],
  templateUrl: './call.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./call.component.css', '../../live-kit/collapsible-call-window.css'],
})
export class CallComponent implements OnDestroy, OnInit {
  constructor(
    private auth: AuthenticationService,
    private dataService: DataService,
    private router: Router,
    protected pip: PictureInPictureService,
  ) {
    this.configureUrls();
  }

  callerId = input<number | null>(null);
  calleeId = input<number | null>(null);
  leaveRoomOutput = output();
  private destroyed = false;

  private buildPipHandles(): PictureInPictureHandles {
    return {
      getMainVideoTrack: () => this.getCurrentMainVideoTrack(),
      getSelfVideoTrack: () => this.localCameraTrack() ?? null,
      isMicEnabled: () => this.microphoneEnabled(),
      onToggleMic: () => this.setMicrophoneEnabled(!this.microphoneEnabled()),
      onLeave: () => this.leaveRoom(),
    };
  }

  /**
   * Manual trigger for the cross-tab floating window. A real click here
   * always satisfies the browser's user-activation requirement for
   * documentPictureInPicture.requestWindow() - unlike the automatic
   * tab-switch trigger below, which only works when a recent-enough
   * click on the page happens to still count as "active".
   */
  popOutToPictureInPicture(): void {
    this.pip.open(this.buildPipHandles());
  }

  private onVisibilityChange = () => {
    if (document.visibilityState === 'hidden' && this.room()) {
      this.pip.open(this.buildPipHandles());
    } else if (document.visibilityState === 'visible') {
      this.pip.close();
    }
  };

  firsName = this.auth.authDataSignal().firstName as string;
  lastName = this.auth.authDataSignal().lastName as string;

  roomForm = new FormGroup({
    roomName: new FormControl('' + Date.now(), Validators.required),
    participantName: new FormControl(
      `${this.firsName}  ${this.lastName}`,
      Validators.required,
    ),
  });
  currentRoomLink = signal<string>('');

  room = signal<Room | undefined>(undefined);
  localTrack = signal<LocalVideoTrack | undefined>(undefined);
  remoteTracksMap = signal<Map<string, TrackInfo>>(new Map());
  // input from route
  id = input<string | null>();
  cameraIsEnable = signal<boolean>(false);
  screenShareEnabled = signal<boolean>(false);
  microphoneEnabled = signal<boolean>(true);
  localCameraTrack = signal<LocalVideoTrack | undefined>(undefined);
  localScreenTrack = signal<LocalVideoTrack | undefined>(undefined);
  videoSize = signal<'small' | 'medium' | 'large' | 'fullscreen'>('medium');
  isFullscreen = signal<boolean>(false);

  mainVideoTrack = signal<VideoTrack | null>(null);
  mainVideoParticipant = signal<string>('');
  isLocalMainVideo = signal<boolean>(true);

  chatOpen = signal<boolean>(false);
  messages = signal<MeetingChatMessage[]>([]);
  raisedHandsPanelOpen = signal<boolean>(false);
  handsRaised = signal<RaisedHandEntry[]>([]);
  ownHandRaised = signal<boolean>(false);
  videoDevices = signal<MediaDeviceInfo[]>([]);
  audioDevices = signal<MediaDeviceInfo[]>([]);
  selectedVideoDeviceId = signal<string | undefined>(undefined);
  selectedAudioDeviceId = signal<string | undefined>(undefined);

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

  private applyHandRaiseEvent(type: 'hand-raised' | 'hand-lowered', participant?: RemoteParticipant): void {
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

  ngOnInit() {
    const user = this.auth.authDataSignal();

    if (!this.callerId() || !this.calleeId() || !user?.id) {
      console.warn('Missing callerId, calleeId or user data');
      return;
    }


    // const participants = [this.callerId(), this.calleeId()].sort();
    const roomName = `room-${this.callerId()}-${this.calleeId()}`;
    // Hash the room name to create a unique identifier
    const hashedRoomName = btoa(roomName); // Base64 encode the room name
    // set the hashed room name to route params
    const participantName = `${user.firstName}-${user.lastName}`;
    this.updateQueryParam(hashedRoomName);

    this.roomForm.patchValue({
      roomName: hashedRoomName,
      participantName,
    });

    if (this.roomForm.valid) {
      this.joinRoom();
    } else {
      console.warn('Room form invalid:', this.roomForm.value);
    }
    // });
    // Initialize camera as disabled
    this.setMicrophoneEnabled(true);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  configureUrls() {
    // If APPLICATION_SERVER_URL is not configured, use default value from OpenVidu Local deployment
    if (!APPLICATION_SERVER_URL) {
      if (window.location.hostname === 'localhost') {
        // APPLICATION_SERVER_URL = 'http://localhost:4004/api/v1/';
      } else {
        APPLICATION_SERVER_URL =
          'https://' + window.location.hostname + ':6443/';
      }
    }

    // If LIVEKIT_URL is not configured, use default value from OpenVidu Local deployment
    if (!LIVEKIT_URL) {
      if (window.location.hostname === 'localhost') {
        LIVEKIT_URL = 'ws://localhost:7880/';
      } else {
        LIVEKIT_URL = 'wss://' + window.location.hostname + ':7443/';
      }
    }
  }

  async joinRoom() {
    this.playSound('join');
    // Initialize a new Room object
    const room = new Room({
      adaptiveStream: true, // Enable adaptive stream to optimize video quality
      dynacast: true, // Enable dynacast to reduce bandwidth usage
      // autoSubscribe: true, // Automatically subscribe to all tracks in the room
      // default capture settings
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
    });
    this.room.set(room);

    // Specify the actions when events take place in the room
    // On every new Track received...
    room.on(
      RoomEvent.TrackSubscribed,
      (
        _track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant,
      ) => {
        this.remoteTracksMap.update((map) => {
          map.set(publication.trackSid, {
            trackPublication: publication,
            participantIdentity: participant.identity,
          });
          return map;
        });
      },
    );

    // On every new Track destroyed...
    room.on(
      RoomEvent.TrackUnsubscribed,
      (_track: RemoteTrack, publication: RemoteTrackPublication) => {
        this.remoteTracksMap.update((map) => {
          map.delete(publication.trackSid);
          return map;
        });
      },
    );
    // Add this to your joinRoom() method after creating the room and setting up other event listeners

    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      if (publication.kind === 'video') {
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
      }
    });

    room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
      if (publication.kind === 'video') {
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

    try {
      // Get the room name and participant name from the form
      const roomName = this.roomForm.value.roomName!;
      const participantName = this.roomForm.value.participantName!;

      // Get a token from your application server with the room name and participant name
      const token = await this.getToken(roomName, participantName);

      // Connect to the room with the LiveKit URL and the token
      await room.connect(LIVEKIT_URL, token);

      this.currentRoomLink.set(
        window.location.origin +
          `/pages/call/${this.callerId()}/${this.calleeId()}/?id=` +
          roomName,
      );
      const cameraTrack = Array.from(
        room.localParticipant.videoTrackPublications.values(),
      ).find((pub) => pub.source === 'camera')?.videoTrack;
      if (cameraTrack) {
        this.localCameraTrack.set(cameraTrack);
        this.localTrack.set(cameraTrack);
      }

      navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange);
      await this.refreshDevices();
    } catch (_error: any) {
      await this.leaveRoom();
    }
  }

  async switchVideoDevice(deviceId: string): Promise<void> {
    const room = this.room();
    if (!room) {
      return;
    }
    this.selectedVideoDeviceId.set(deviceId);
    await room.switchActiveDevice('videoinput', deviceId);
    const cameraTrack = Array.from(
      room.localParticipant.videoTrackPublications.values(),
    ).find((pub) => pub.source === 'camera')?.videoTrack;
    if (cameraTrack) {
      this.localCameraTrack.set(cameraTrack);
      if (!this.screenShareEnabled()) {
        this.localTrack.set(cameraTrack);
      }
    }
  }

  async switchAudioDevice(deviceId: string): Promise<void> {
    const room = this.room();
    if (!room) {
      return;
    }
    this.selectedAudioDeviceId.set(deviceId);
    await room.switchActiveDevice('audioinput', deviceId);
  }

  async refreshDevices(): Promise<void> {
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

  toggleRaiseHand(): void {
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
    const name = this.roomForm.value.participantName || identity;
    if (nextValue) {
      this.handsRaised.update((list) => (
        list.some((entry) => entry.identity === identity)
          ? list
          : [...list, { identity, name, ts: Date.now() }]
      ));
    } else {
      this.handsRaised.update((list) => list.filter((entry) => entry.identity !== identity));
    }
  }

  isHandRaised(identity: string): boolean {
    return this.handsRaised().some((entry) => entry.identity === identity);
  }

  isCurrentMainVideoHandRaised(): boolean {
    if (this.isCurrentMainVideoLocal()) {
      return this.ownHandRaised();
    }
    return this.isHandRaised(this.getCurrentMainVideoLabel());
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
    const senderName = this.roomForm.value.participantName || 'You';
    this.messages.update((list) => [...list, { senderName, text, ts: Date.now() }]);
  }

  async leaveRoom() {
    const room = this.room();
    room?.off(RoomEvent.DataReceived, this.onDataReceived);

    // Leave the room by calling 'disconnect' method over the Room object
    await room?.disconnect();

    // Reset all variables
    this.room.set(undefined);
    this.localTrack.set(undefined);
    this.remoteTracksMap.set(new Map());
    this.messages.set([]);
    this.handsRaised.set([]);
    this.ownHandRaised.set(false);
    if (!this.destroyed) {
      this.leaveRoomOutput.emit(); // Emit leave event
    }
  }

  async setCameraEnabled(value: boolean) {
    const room = this.room();
    if (room) {
      const p = room.localParticipant;
      await p.setCameraEnabled(value);
      this.cameraIsEnable.set(value);

      // If we're not screen sharing, update the local track
      if (!this.screenShareEnabled()) {
        if (value) {
          const cameraTrack = Array.from(
            p.videoTrackPublications.values(),
          ).find((pub) => pub.source === 'camera')?.videoTrack;
          if (cameraTrack) {
            this.localTrack.set(cameraTrack);
            this.selectedVideoDeviceId.set(cameraTrack.mediaStreamTrack?.getSettings().deviceId);
          }
        } else {
          this.localTrack.set(undefined);
        }
      }
      // Device labels are only populated by the browser once permission has
      // actually been granted - re-enumerate now that camera access happened.
      void this.refreshDevices();
    }
  }

  getLocalVideoLabel(): string {
    if (this.screenShareEnabled()) {
      return 'Your Screen';
    }
    return this.roomForm.value.participantName + ' (You)';
  }

  async copyLink() {
    try {
      await navigator.clipboard.writeText(this.currentRoomLink());
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy link:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = this.currentRoomLink();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  // Update your setScreenShareEnabled method to be simpler
  async setScreenShareEnabled(value: boolean) {
    this.playSound('screenshare');
    const room = this.room();
    if (room) {
      try {
        const p = room.localParticipant;

        if (value) {
          // Start screen sharing
          await p.setScreenShareEnabled(true);

          // Debug: Check if screen share track was created
          setTimeout(() => {
            const screenTrack = Array.from(
              p.videoTrackPublications.values(),
            ).find((pub) => pub.source === 'screen_share');

            if (screenTrack?.videoTrack) {
            }
          }, 1000);
        } else {
          await p.setScreenShareEnabled(false);
        }
      } catch (error) {
        console.error('Error toggling screen share:', error);
        this.screenShareEnabled.set(false);
      }
    }
  }

  async setMicrophoneEnabled(value: boolean) {
    const room = this.room();
    if (room) {
      const p = room.localParticipant;
      await p.setMicrophoneEnabled(value);
      this.microphoneEnabled.set(value);
      if (value) {
        const micTrack = Array.from(
          p.audioTrackPublications.values(),
        ).find((pub) => pub.source === 'microphone')?.audioTrack;
        this.selectedAudioDeviceId.set(micTrack?.mediaStreamTrack?.getSettings().deviceId);
      }
      void this.refreshDevices();
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  async ngOnDestroy(_event?: Event) {
    this.destroyed = true;
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChange);
    this.pip.close();
    // On window closed or component destroyed, leave the room
    await this.leaveRoom();
  }

  /**
   * --------------------------------------------
   * GETTING A TOKEN FROM YOUR APPLICATION SERVER
   * --------------------------------------------
   * The method below request the creation of a token to
   * your application server. This prevents the need to expose
   * your LiveKit API key and secret to the client side.
   *
   * In this sample code, there is no user control at all. Anybody could
   * access your application server endpoints. In a real production
   * environment, your application server must identify the user to allow
   * access to the endpoints.
   */
  async getToken(roomName: string, participantName: string): Promise<string> {
    const response = await lastValueFrom(
      this.dataService.sendToken('/api/token', { roomName, participantName }),
    );
    return response.token;
  }

  // Method to change video size
  setVideoSize(size: 'small' | 'medium' | 'large' | 'fullscreen') {
    this.videoSize.set(size);

    if (size === 'fullscreen') {
      this.enterFullscreen();
    } else if (this.isFullscreen()) {
      this.exitFullscreen();
    }
  }

  // Enter fullscreen mode
  async enterFullscreen() {
    try {
      const videoElement = document.querySelector('video') as HTMLVideoElement;
      if (videoElement && videoElement.requestFullscreen) {
        await videoElement.requestFullscreen();
        this.isFullscreen.set(true);
      }
    } catch (error) {
      console.error('Error entering fullscreen:', error);
      // Fallback to CSS fullscreen
      this.isFullscreen.set(true);
    }
  }

  // Exit fullscreen mode
  async exitFullscreen() {
    try {
      if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen();
      }
      this.isFullscreen.set(false);
      this.videoSize.set('medium');
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
      this.isFullscreen.set(false);
    }
  }

  // Toggle fullscreen
  toggleFullscreen() {
    if (this.isFullscreen()) {
      this.exitFullscreen();
    } else {
      this.setVideoSize('fullscreen');
    }
  }

  // Listen for fullscreen changes
  @HostListener('document:fullscreenchange', ['$event'])
  onFullscreenChange() {
    if (!document.fullscreenElement && this.isFullscreen()) {
      this.isFullscreen.set(false);
      this.videoSize.set('medium');
    }
  }

  // Get CSS class for current video size
  getVideoSizeClass(): string {
    const size = this.videoSize();
    return `video-${size}`;
  }

  setMainVideo(
    track: VideoTrack,
    participantIdentity: string,
    isLocal = false,
  ) {
    this.mainVideoTrack.set(track);
    this.mainVideoParticipant.set(participantIdentity);
    this.isLocalMainVideo.set(isLocal);
  }

  // Method to get the current main video track
  getCurrentMainVideoTrack(): VideoTrack | null {
    // Priority: manually selected > screen share > local camera > first remote video
    if (this.mainVideoTrack()) {
      return this.mainVideoTrack();
    }

    // Auto-selection logic: prefer screen share when available
    if (this.screenShareEnabled() && this.localTrack()) {
      return this.localTrack() as VideoTrack;
    }

    if (this.localCameraTrack()) {
      return this.localCameraTrack() as VideoTrack;
    }

    // Get first available remote video track
    const firstRemoteVideo = Array.from(this.remoteTracksMap().values()).find(
      (track) => track.trackPublication.kind === 'video',
    );

    return firstRemoteVideo?.trackPublication.videoTrack || null;
  }

  // Method to get main video label
  getCurrentMainVideoLabel(): string {
    if (this.mainVideoParticipant()) {
      return this.mainVideoParticipant();
    }

    // Auto-selection labels
    if (this.screenShareEnabled() && this.localTrack()) {
      return 'You (Screen Share)';
    }

    if (this.localCameraTrack()) {
      return 'You (Camera)';
    }

    const firstRemoteVideo = Array.from(this.remoteTracksMap().values()).find(
      (track) => track.trackPublication.kind === 'video',
    );

    return firstRemoteVideo?.participantIdentity || 'No Video';
  }

  // Check if we should show camera PiP overlay
  shouldShowCameraPiP(): boolean {
    return (
      this.screenShareEnabled() &&
      !!this.localCameraTrack() &&
      this.getCurrentMainVideoTrack() !== this.localCameraTrack()
    );
  }

  // Method to check if current main video is local
  isCurrentMainVideoLocal(): boolean {
    if (this.mainVideoTrack()) {
      return this.isLocalMainVideo();
    }

    return this.screenShareEnabled() || !!this.localCameraTrack();
  }

  // Method to reset main video selection (go back to auto-selection)
  resetMainVideoSelection() {
    this.mainVideoTrack.set(null);
    this.mainVideoParticipant.set('');
    this.isLocalMainVideo.set(true);
  }

  // Method to toggle fullscreen for main video
  toggleMainVideoFullscreen() {
    if (this.isFullscreen()) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  updateQueryParam(id: string) {
    this.router.navigate([], {
      queryParams: { id },
      queryParamsHandling: 'merge',
      replaceUrl: true, // prevents pushing to history stack
      skipLocationChange: false, // keep the URL change visible
    });
  }
  playSound(name: 'join' | 'screenshare') {
    const audio = new Audio();
    audio.src = `assets/audio/${name}.mp3`;
    audio.load();
    audio.play().catch((err) => console.warn('Audio play error:', err));
  }
}
