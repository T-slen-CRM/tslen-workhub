import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  input,
  signal,
  viewChild,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client';
import { NgClass } from '@angular/common';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'video-component',
  imports: [NgClass, MatIconButton, MatIcon],
  templateUrl: './video.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './video.component.css',
})
export class VideoComponent implements AfterViewInit, OnDestroy {
  videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoElement');
  videoContainer = viewChild<ElementRef<HTMLDivElement>>('videoContainer');

  track = input.required<LocalVideoTrack | RemoteVideoTrack>();
  participantIdentity = input.required<string>();
  local = input(false);
  isMainVideo = input(false);
  isPreview = input(false);
  isThumbnail = input(false); // New input property

  isFullscreen = signal(false);

  constructor() {
    // Watch for track changes and reattach
    effect(() => {
      const track = this.track();
      const videoEl = this.videoElement();

      if (videoEl && track) {
        this.attachTrack();
      }
    });
  }

  ngAfterViewInit() {
    this.attachTrack();
  }

  private attachTrack() {
    const videoEl = this.videoElement();
    const track = this.track();

    if (videoEl && track) {
      // Detach any existing track first
      if (videoEl.nativeElement.srcObject) {
        track.detach(videoEl.nativeElement);
      }

      // Attach the new track
      track.attach(videoEl.nativeElement);

      // Debug logging

      // Ensure video plays
      videoEl.nativeElement.play().catch((_err) => {
        // console.warn('Video play failed:', err);
      });
    }
  }

  // Only the local camera preview should ever be mirrored (a selfie-view
  // convention) - a remote participant's camera and any screen share
  // must render as-is, or shared text/UI would read backwards.
  getTransform(): string {
    return this.local() && this.track().source !== 'screen_share'
      ? 'scaleX(-1)'
      : 'none';
  }

  async toggleFullscreen(): Promise<void> {
    const el = this.videoContainer()?.nativeElement;
    if (!el) {
      return;
    }
    if (document.fullscreenElement === el) {
      await document.exitFullscreen();
    } else {
      await el.requestFullscreen();
    }
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen.set(document.fullscreenElement === this.videoContainer()?.nativeElement);
  }

  getObjectFit(): string {
    const track = this.track();

    // For thumbnails, always use 'cover' to fill the space nicely
    if (this.isThumbnail()) {
      return 'cover';
    }

    // Use 'contain' for screen shares to show full content
    if (track.source === 'screen_share') {
      return 'contain';
    }

    // Use 'cover' for camera feeds
    return this.isPreview() ? 'cover' : 'contain';
  }

  // New method to get CSS classes for the container
  getContainerClasses(): string {
    const classes = ['video-container'];

    if (this.isMainVideo()) {
      classes.push('main-video');
    } else if (this.isPreview()) {
      classes.push('preview-video');
    } else if (this.isThumbnail()) {
      classes.push('thumbnail-video'); // New class for thumbnails
    } else {
      classes.push('remote-video');
    }

    return classes.join(' ');
  }

  ngOnDestroy() {
    const videoEl = this.videoElement();
    if (videoEl) {
      this.track().detach(videoEl.nativeElement);
    }
  }
}
