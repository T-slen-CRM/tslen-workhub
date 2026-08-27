import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { DataService } from '../../services/data.service';
import { AuthenticationService } from '../../services/auth.service';
import { MeetingRoomComponent } from '../../meeting-room/meeting-room.component';

interface MeetingLinkRow {
  id: number;
  title: string | null;
  roomName: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface HostConnection {
  livekitToken: string;
  roomName: string;
  displayName: string;
}

@Component({
  selector: 'app-meeting-links-manager',
  standalone: true,
  imports: [FormsModule, TranslateModule, MeetingRoomComponent],
  templateUrl: './meeting-links-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './meeting-links-manager.component.css',
})
export class MeetingLinksManagerComponent implements OnInit {
  private dataService = inject(DataService);
  private auth = inject(AuthenticationService);
  private toastr = inject(ToastrService);

  links = signal<MeetingLinkRow[]>([]);
  justCreatedLink = signal<string | null>(null);
  justCreatedLinkId = signal<number | null>(null);
  activeRoom = signal<HostConnection | null>(null);
  titleDraft = '';
  expiresAtDraft = '';

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.dataService.listMeetingLinks().subscribe({
      next: (links) => this.links.set(links),
      error: () => this.toastr.warning('Could not load meeting links'),
    });
  }

  create(): void {
    const expiresAt = this.expiresAtDraft ? new Date(this.expiresAtDraft).toISOString() : undefined;
    this.dataService.createMeetingLink({ title: this.titleDraft || undefined, expiresAt }).subscribe({
      next: (created) => {
        this.justCreatedLink.set(`${window.location.origin}/meet/${created.token}`);
        this.justCreatedLinkId.set(created.id);
        this.titleDraft = '';
        this.expiresAtDraft = '';
        this.refresh();
      },
      error: () => this.toastr.warning('Could not create meeting link'),
    });
  }

  revoke(id: number): void {
    this.dataService.revokeMeetingLink(id).subscribe({
      next: () => {
        if (this.justCreatedLinkId() === id) {
          this.justCreatedLink.set(null);
          this.justCreatedLinkId.set(null);
        }
        this.refresh();
      },
      error: () => this.toastr.warning('Could not revoke meeting link'),
    });
  }

  async copyJustCreatedLink(): Promise<void> {
    const url = this.justCreatedLink();
    if (!url) {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      this.toastr.success('Link copied');
    } catch {
      this.toastr.warning('Could not copy link');
    }
  }

  joinOwnMeeting(link: MeetingLinkRow): void {
    const user = this.auth.authDataSignal();
    const participantName = `${user.firstName}-${user.lastName}`;
    this.dataService.sendToken('/api/token', { roomName: link.roomName, participantName }).subscribe({
      next: (result) => {
        this.activeRoom.set({ livekitToken: result.token, roomName: link.roomName, displayName: participantName });
      },
      error: () => this.toastr.warning('Could not join meeting'),
    });
  }

  onLeaveOwnMeeting(): void {
    this.activeRoom.set(null);
  }
}
