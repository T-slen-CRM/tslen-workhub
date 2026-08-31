import { Component, OnInit, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DataService } from '../../../services/data.service';
import { AuthenticationService } from '../../../services/auth.service';
import { PreJoinLobbyComponent, PreJoinResult } from '../../../meeting-room/pre-join-lobby/pre-join-lobby.component';
import { ActiveMeetingCallService } from '../active-meeting-call.service';

@Component({
  selector: 'app-join-meeting-link',
  standalone: true,
  imports: [TranslateModule, PreJoinLobbyComponent],
  templateUrl: './join-meeting-link.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinMeetingLinkComponent implements OnInit {
  private dataService = inject(DataService);
  private auth = inject(AuthenticationService);
  private activeMeetingCall = inject(ActiveMeetingCallService);
  private router = inject(Router);

  token = input<string>('');

  state = signal<'loading' | 'invalid' | 'lobby'>('loading');
  joinError = signal(false);
  private roomName = signal<string | null>(null);

  ngOnInit(): void {
    this.dataService.getPublicMeetingLink(this.token()).subscribe({
      next: (info) => {
        this.roomName.set(info.roomName);
        this.state.set('lobby');
      },
      error: () => this.state.set('invalid'),
    });
  }

  hostDisplayName(): string {
    const user = this.auth.authDataSignal();
    return `${user.firstName}-${user.lastName}`;
  }

  onLobbyJoined(result: PreJoinResult, lobby?: PreJoinLobbyComponent): void {
    const roomName = this.roomName();
    if (!roomName) {
      return;
    }
    this.joinError.set(false);
    const participantName = this.hostDisplayName();
    this.dataService.sendToken('/api/token', { roomName, participantName }).subscribe({
      next: (tokenResult) => {
        this.activeMeetingCall.start({
          livekitToken: tokenResult.token,
          roomName,
          displayName: participantName,
          videoTrack: result.videoTrack,
          audioTrack: result.audioTrack,
          backgroundEffect: result.backgroundEffect,
          backgroundImage: result.backgroundImage,
        });
        this.router.navigate(['/pages/live-kit']);
      },
      error: () => {
        this.joinError.set(true);
        lobby?.resumeAfterFailedJoin();
      },
    });
  }
}
