import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  input,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { LocalAudioTrack, RemoteAudioTrack } from 'livekit-client';

@Component({
  selector: 'audio-component',
  imports: [],
  templateUrl: './audio.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './audio.component.css',
})
export class AudioComponent implements AfterViewInit, OnDestroy {
  audioElement = viewChild<ElementRef<HTMLAudioElement>>('audioElement');

  track = input.required<LocalAudioTrack | RemoteAudioTrack>();

  ngAfterViewInit() {
    if (this.audioElement()) {
      this.track().attach(this.audioElement()!.nativeElement);
    }
  }

  ngOnDestroy() {
    this.track().detach();
  }
}
