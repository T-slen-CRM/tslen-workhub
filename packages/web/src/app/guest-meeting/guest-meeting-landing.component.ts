import { Component, OnInit, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LocalAudioTrack, LocalVideoTrack } from 'livekit-client';
import { DataService } from '../services/data.service';
import { MeetingRoomComponent } from '../meeting-room/meeting-room.component';
import { PreJoinLobbyComponent, PreJoinResult } from '../meeting-room/pre-join-lobby/pre-join-lobby.component';

interface MeetingInfo {
  title: string | null;
  hostName: string;
  roomName: string;
}

interface GuestConnection {
  livekitToken: string;
  roomName: string;
  displayName: string;
  videoTrack: LocalVideoTrack | undefined;
  audioTrack: LocalAudioTrack | undefined;
}

@Component({
  selector: 'app-guest-meeting-landing',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, MeetingRoomComponent, PreJoinLobbyComponent],
  templateUrl: './guest-meeting-landing.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './guest-meeting-landing.component.css',
})
export class GuestMeetingLandingComponent implements OnInit {
  private dataService = inject(DataService);

  token = input<string>('');

  state = signal<'loading' | 'invalid' | 'ready' | 'lobby' | 'in-call'>('loading');
  meetingInfo = signal<MeetingInfo | null>(null);
  connection = signal<GuestConnection | null>(null);
  joinError = signal(false);
  displayNameControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  ngOnInit(): void {
    this.dataService.getPublicMeetingLink(this.token()).subscribe({
      next: (info) => {
        this.meetingInfo.set(info);
        this.state.set('ready');
      },
      error: () => this.state.set('invalid'),
    });
  }

  continueToLobby(): void {
    if (this.displayNameControl.invalid) {
      return;
    }
    this.joinError.set(false);
    this.state.set('lobby');
  }

  onLobbyJoined(result: PreJoinResult, lobby?: PreJoinLobbyComponent): void {
    const displayName = this.displayNameControl.value;
    this.joinError.set(false);
    this.dataService.joinMeetingAsGuest(this.token(), displayName).subscribe({
      next: (joinResult) => {
        this.connection.set({
          livekitToken: joinResult.livekitToken,
          roomName: joinResult.roomName,
          displayName,
          videoTrack: result.videoTrack,
          audioTrack: result.audioTrack,
        });
        this.state.set('in-call');
      },
      error: () => {
        this.joinError.set(true);
        lobby?.resumeAfterFailedJoin();
      },
    });
  }

  onLeave(): void {
    this.connection.set(null);
    this.state.set('ready');
  }
}
