import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { PreJoinLobbyComponent, PreJoinResult } from '../../meeting-room/pre-join-lobby/pre-join-lobby.component';
import { DataService } from '../../services/data.service';
import { ActiveMeetingCallService } from './active-meeting-call.service';
import { JoinOwnMeetingRequest } from './join-own-meeting.service';

// Thin MatDialog host for <app-pre-join-lobby>, so any page can trigger the
// same "camera/mic check -> mint own LiveKit token -> hand off to the
// app-wide call overlay" sequence without duplicating it inline (see
// JoinOwnMeetingService, and MeetingLinksManagerComponent for the original,
// page-embedded version of this same flow). PreJoinLobbyComponent has no
// close/cancel affordance of its own - it's normally embedded directly on a
// page, where "leaving" just means navigating elsewhere - so this wrapper
// supplies one; without it there was no way to back out of the dialog once
// opened.
@Component({
  selector: 'app-join-own-meeting-dialog',
  standalone: true,
  imports: [PreJoinLobbyComponent, MatIconModule, MatButtonModule],
  template: `
    <div class="join-own-meeting-dialog">
      <button mat-icon-button type="button" class="join-own-meeting-close" aria-label="Close" (click)="dialogRef.close()">
        <mat-icon>close</mat-icon>
      </button>
      <app-pre-join-lobby #lobby [displayName]="data.displayName" (joined)="onJoined($event, lobby)"></app-pre-join-lobby>
    </div>
  `,
  styles: [`
    .join-own-meeting-dialog { position: relative; }
    .join-own-meeting-close { position: absolute; top: 4px; right: 4px; z-index: 10; }
  `],
})
export class JoinOwnMeetingDialogComponent {
  data = inject<JoinOwnMeetingRequest>(MAT_DIALOG_DATA);

  dialogRef = inject(MatDialogRef<JoinOwnMeetingDialogComponent>);
  private dataService = inject(DataService);
  private activeMeetingCall = inject(ActiveMeetingCallService);
  private toastr = inject(ToastrService);

  onJoined(result: PreJoinResult, lobby: PreJoinLobbyComponent): void {
    this.dataService.sendToken('/api/token', { roomName: this.data.roomName, participantName: this.data.displayName }).subscribe({
      next: (tokenResult) => {
        this.activeMeetingCall.start({
          livekitToken: tokenResult.token,
          roomName: this.data.roomName,
          displayName: this.data.displayName,
          videoTrack: result.videoTrack,
          audioTrack: result.audioTrack,
          backgroundEffect: result.backgroundEffect,
          backgroundImage: result.backgroundImage,
        });
        this.dialogRef.close();
      },
      error: () => {
        this.toastr.warning('Could not join meeting');
        lobby.resumeAfterFailedJoin();
      },
    });
  }
}
