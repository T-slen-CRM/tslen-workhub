import { Component, OnInit, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DataService } from '../services/data.service';
import { MeetingRoomComponent } from '../meeting-room/meeting-room.component';

interface MeetingInfo {
  title: string | null;
  hostName: string;
  roomName: string;
}

interface GuestConnection {
  livekitToken: string;
  roomName: string;
  displayName: string;
}

@Component({
  selector: 'app-guest-meeting-landing',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, MeetingRoomComponent],
  templateUrl: './guest-meeting-landing.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './guest-meeting-landing.component.css',
})
export class GuestMeetingLandingComponent implements OnInit {
  private dataService = inject(DataService);

  token = input<string>('');

  state = signal<'loading' | 'invalid' | 'ready' | 'in-call'>('loading');
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

  join(): void {
    if (this.displayNameControl.invalid) {
      return;
    }
    const displayName = this.displayNameControl.value;
    this.joinError.set(false);
    this.dataService.joinMeetingAsGuest(this.token(), displayName).subscribe({
      next: (result) => {
        this.connection.set({ livekitToken: result.livekitToken, roomName: result.roomName, displayName });
        this.state.set('in-call');
      },
      error: () => this.joinError.set(true),
    });
  }

  onLeave(): void {
    this.connection.set(null);
    this.state.set('ready');
  }
}
