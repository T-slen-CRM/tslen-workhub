import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthenticationService } from '../../services/auth.service';
import { JoinOwnMeetingDialogComponent } from './join-own-meeting-dialog.component';

export interface JoinOwnMeetingRequest {
  roomName: string;
  displayName: string;
}

// Entry point for joining a room the current user hosts (a tslen-meet
// created from the Make-a-request dialog, or one created via the
// meeting-links manager) with their own LiveKit token, from anywhere in the
// app - opens the pre-join lobby in a dialog rather than requiring the
// calling page to embed/toggle it itself. See JoinOwnMeetingDialogComponent
// for the actual join sequence.
@Injectable({ providedIn: 'root' })
export class JoinOwnMeetingService {
  private dialog = inject(MatDialog);
  private auth = inject(AuthenticationService);

  join(roomName: string): void {
    const user = this.auth.authDataSignal();
    const displayName = `${user.firstName}-${user.lastName}`;
    this.dialog.open(JoinOwnMeetingDialogComponent, {
      data: { roomName, displayName } as JoinOwnMeetingRequest,
      // No fixed width: the pre-join lobby lays its video preview (480px)
      // out in a row next to a settings sidebar (see
      // pre-join-lobby.component.css's .pre-join-lobby/.pre-join-preview) -
      // a hard 480px dialog width used to crush that into an unusable
      // sliver. Also not disableClose, since JoinOwnMeetingDialogComponent
      // has its own close button, but backdrop-click/Escape should work too.
      maxWidth: '95vw',
      maxHeight: '95vh',
      autoFocus: false,
    });
  }
}
