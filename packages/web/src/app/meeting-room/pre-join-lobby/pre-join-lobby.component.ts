import { Component, OnDestroy, OnInit, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { LocalAudioTrack, LocalVideoTrack, Room, createAudioAnalyser, createLocalAudioTrack, createLocalVideoTrack } from 'livekit-client';
import { BackgroundProcessor, BackgroundProcessorWrapper } from '@livekit/track-processors';
import { VideoComponent } from '../../pages/call/video/video.component';

const STORAGE_KEY = 'preJoinLobbyPrefs';

export type BackgroundEffect = 'none' | 'blur' | 'image';

export interface BackgroundImagePreset {
  id: string;
  labelKey: string;
  path: string;
}

export const BACKGROUND_IMAGE_PRESETS: BackgroundImagePreset[] = [
  { id: 'office', labelKey: 'pre_join_lobby.background_office', path: 'assets/backgrounds/office.svg' },
  { id: 'gradient', labelKey: 'pre_join_lobby.background_gradient', path: 'assets/backgrounds/gradient-blue.svg' },
  { id: 'solid', labelKey: 'pre_join_lobby.background_solid', path: 'assets/backgrounds/solid-gray.svg' },
];

export interface PreJoinResult {
  videoTrack: LocalVideoTrack | undefined;
  audioTrack: LocalAudioTrack | undefined;
  backgroundEffect: BackgroundEffect;
}

interface PreJoinLobbyPrefs {
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  backgroundEffect: BackgroundEffect;
  backgroundImage?: string;
  videoDeviceId?: string;
  audioDeviceId?: string;
}

@Component({
  selector: 'app-pre-join-lobby',
  standalone: true,
  imports: [MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatIconModule, MatSelectModule, TranslateModule, VideoComponent],
  templateUrl: './pre-join-lobby.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './pre-join-lobby.component.css',
})
export class PreJoinLobbyComponent implements OnInit, OnDestroy {
  displayName = input.required<string>();
  joined = output<PreJoinResult>();

  videoTrack = signal<LocalVideoTrack | undefined>(undefined);
  audioTrack = signal<LocalAudioTrack | undefined>(undefined);
  cameraEnabled = signal(false);
  microphoneEnabled = signal(false);
  cameraError = signal(false);
  microphoneError = signal(false);
  audioLevel = signal(0);
  backgroundEffect = signal<BackgroundEffect>('none');
  selectedBackgroundImage = signal<string | undefined>(undefined);
  backgroundUnavailable = signal(false);

  initializing = signal(true);

  videoDevices = signal<MediaDeviceInfo[]>([]);
  audioDevices = signal<MediaDeviceInfo[]>([]);
  selectedVideoDeviceId = signal<string | undefined>(undefined);
  selectedAudioDeviceId = signal<string | undefined>(undefined);

  backgroundImagePresets = BACKGROUND_IMAGE_PRESETS;

  private analyserCleanup: (() => Promise<void>) | undefined;
  private levelFrame: number | undefined;
  private processor: BackgroundProcessorWrapper | undefined;
  private handedOff = false;
  private destroyed = false;
  private cameraGeneration = 0;
  private microphoneGeneration = 0;

  private handleDeviceChange = (): void => {
    void this.refreshDevices();
  };

  async ngOnInit(): Promise<void> {
    const prefs = this.readPrefs();
    this.selectedVideoDeviceId.set(prefs.videoDeviceId);
    this.selectedAudioDeviceId.set(prefs.audioDeviceId);
    await Promise.allSettled([
      prefs.cameraEnabled ? this.startCamera(prefs.videoDeviceId) : Promise.resolve(),
      prefs.microphoneEnabled ? this.startMicrophone(prefs.audioDeviceId) : Promise.resolve(),
    ]);
    if (prefs.backgroundEffect !== 'none' && this.videoTrack()) {
      await this.setBackgroundEffect(prefs.backgroundEffect, prefs.backgroundImage);
    }
    navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange);
    this.initializing.set(false);
  }

  async setCameraEnabled(value: boolean): Promise<void> {
    if (value) {
      await this.startCamera();
    } else {
      this.cameraGeneration++;
      this.videoTrack()?.stop();
      this.videoTrack.set(undefined);
      this.cameraEnabled.set(false);
      this.backgroundEffect.set('none');
      this.selectedBackgroundImage.set(undefined);
      this.processor = undefined;
    }
    this.writePrefs({ cameraEnabled: this.cameraEnabled() });
  }

  async setMicrophoneEnabled(value: boolean): Promise<void> {
    if (value) {
      await this.startMicrophone();
    } else {
      this.microphoneGeneration++;
      this.stopLevelMeter();
      this.audioTrack()?.stop();
      this.audioTrack.set(undefined);
      this.microphoneEnabled.set(false);
    }
    this.writePrefs({ microphoneEnabled: this.microphoneEnabled() });
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
    const track = this.videoTrack();
    if (!track) {
      return;
    }
    if (effect === 'none') {
      await track.stopProcessor();
      this.processor = undefined;
      this.backgroundEffect.set('none');
      this.selectedBackgroundImage.set(undefined);
      this.writePrefs({ backgroundEffect: 'none', backgroundImage: undefined });
      return;
    }
    try {
      this.processor = effect === 'blur'
        ? BackgroundProcessor({ mode: 'background-blur', blurRadius: 10 })
        : BackgroundProcessor({ mode: 'virtual-background', imagePath: imagePath! });
      await track.setProcessor(this.processor);
      this.backgroundEffect.set(effect);
      this.selectedBackgroundImage.set(effect === 'image' ? imagePath : undefined);
      this.backgroundUnavailable.set(false);
    } catch {
      this.processor = undefined;
      this.backgroundEffect.set('none');
      this.selectedBackgroundImage.set(undefined);
      this.backgroundUnavailable.set(true);
      return;
    }
    this.writePrefs({ backgroundEffect: effect, backgroundImage: effect === 'image' ? imagePath : undefined });
  }

  async selectVideoDevice(deviceId: string): Promise<void> {
    this.selectedVideoDeviceId.set(deviceId);
    this.writePrefs({ videoDeviceId: deviceId });
    if (!this.cameraEnabled()) {
      return;
    }
    this.videoTrack()?.stop();
    this.videoTrack.set(undefined);
    this.backgroundEffect.set('none');
    this.selectedBackgroundImage.set(undefined);
    this.processor = undefined;
    await this.startCamera(deviceId);
  }

  async selectMicrophoneDevice(deviceId: string): Promise<void> {
    this.selectedAudioDeviceId.set(deviceId);
    this.writePrefs({ audioDeviceId: deviceId });
    if (!this.microphoneEnabled()) {
      return;
    }
    this.stopLevelMeter();
    this.audioTrack()?.stop();
    this.audioTrack.set(undefined);
    await this.startMicrophone(deviceId);
  }

  private async refreshDevices(): Promise<void> {
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

  private readPrefs (): PreJoinLobbyPrefs {
    const defaults: PreJoinLobbyPrefs = { cameraEnabled: true, microphoneEnabled: true, backgroundEffect: 'none' };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return defaults;
      }
      const parsed = JSON.parse(raw);
      // Back-compat: a prefs record saved before background effects supported
      // a virtual-background image only ever had a boolean `blurEnabled`.
      const backgroundEffect: BackgroundEffect = parsed.backgroundEffect ?? (parsed.blurEnabled ? 'blur' : 'none');
      return {
        cameraEnabled: parsed.cameraEnabled ?? defaults.cameraEnabled,
        microphoneEnabled: parsed.microphoneEnabled ?? defaults.microphoneEnabled,
        backgroundEffect,
        backgroundImage: parsed.backgroundImage,
        videoDeviceId: parsed.videoDeviceId,
        audioDeviceId: parsed.audioDeviceId,
      };
    } catch {
      return defaults;
    }
  }

  private writePrefs (overrides: Partial<PreJoinLobbyPrefs>): void {
    const prefs: PreJoinLobbyPrefs = { ...this.readPrefs(), ...overrides };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Best-effort only - a full/blocked localStorage must never break the lobby.
    }
  }

  private async startCamera(deviceId?: string): Promise<void> {
    const generation = ++this.cameraGeneration;
    try {
      const track = await createLocalVideoTrack(deviceId ? { deviceId: { ideal: deviceId } } : undefined);
      if (this.destroyed || generation !== this.cameraGeneration) {
        track.stop();
        return;
      }
      this.videoTrack.set(track);
      this.cameraEnabled.set(true);
      this.cameraError.set(false);
      void this.refreshDevices();
    } catch {
      if (this.destroyed || generation !== this.cameraGeneration) {
        return;
      }
      this.cameraEnabled.set(false);
      this.cameraError.set(true);
    }
  }

  private async startMicrophone(deviceId?: string): Promise<void> {
    const generation = ++this.microphoneGeneration;
    let track: LocalAudioTrack;
    try {
      track = await createLocalAudioTrack(deviceId ? { deviceId: { ideal: deviceId } } : undefined);
    } catch {
      if (this.destroyed || generation !== this.microphoneGeneration) {
        return;
      }
      this.microphoneEnabled.set(false);
      this.microphoneError.set(true);
      return;
    }
    if (this.destroyed || generation !== this.microphoneGeneration) {
      track.stop();
      return;
    }
    this.audioTrack.set(track);
    this.microphoneEnabled.set(true);
    this.microphoneError.set(false);
    void this.refreshDevices();
    try {
      this.startLevelMeter(track);
    } catch {
      // The mic itself is fine - only the level meter (a separate Web Audio
      // AnalyserNode/AudioContext) failed to initialize. The mic stays on
      // and usable; the level bar just won't animate.
    }
  }

  private startLevelMeter(track: LocalAudioTrack): void {
    const { calculateVolume, cleanup } = createAudioAnalyser(track);
    this.analyserCleanup = cleanup;
    const tick = (): void => {
      this.audioLevel.set(calculateVolume());
      this.levelFrame = requestAnimationFrame(tick);
    };
    tick();
  }

  private stopLevelMeter(): void {
    if (this.levelFrame !== undefined) {
      cancelAnimationFrame(this.levelFrame);
      this.levelFrame = undefined;
    }
    this.analyserCleanup?.();
    this.analyserCleanup = undefined;
    this.audioLevel.set(0);
  }

  join(): void {
    if (this.handedOff) {
      return;
    }
    this.handedOff = true;
    this.stopLevelMeter();
    this.joined.emit({
      videoTrack: this.videoTrack(),
      audioTrack: this.audioTrack(),
      backgroundEffect: this.backgroundEffect(),
    });
  }

  /** Called by the embedding component when the backend join/token request
   * that followed `joined` failed, so the lobby stays usable for a retry:
   * un-poisons the hand-off flag (so an eventual `ngOnDestroy` without a
   * successful retry still stops the still-live tracks) and restarts the
   * level meter, which `join()` had stopped. */
  resumeAfterFailedJoin(): void {
    this.handedOff = false;
    const track = this.audioTrack();
    if (track && this.microphoneEnabled()) {
      this.startLevelMeter(track);
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.cameraGeneration++;
    this.microphoneGeneration++;
    navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChange);
    this.stopLevelMeter();
    if (!this.handedOff) {
      this.videoTrack()?.stop();
      this.audioTrack()?.stop();
    }
  }
}
