import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ComponentsModule } from '../../components/components.module';
import { MeetingLinksActionsRendererComponent } from '../../components/data-grid/meeting-links-actions-renderer.component';
import { DataService } from '../../services/data.service';
import { AuthenticationService } from '../../services/auth.service';
import { LanguageService } from '../../language/language.service';
import { PreJoinLobbyComponent, PreJoinResult } from '../../meeting-room/pre-join-lobby/pre-join-lobby.component';
import { ActiveMeetingCallService } from '../live-kit/active-meeting-call.service';

interface MeetingLinkRow {
  id: number;
  title: string | null;
  roomName: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  token: string | null;
}

@Component({
  selector: 'app-meeting-links-manager',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    ComponentsModule,
    PreJoinLobbyComponent,
  ],
  templateUrl: './meeting-links-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './meeting-links-manager.component.css',
})
export class MeetingLinksManagerComponent implements OnInit {
  private dataService = inject(DataService);
  private auth = inject(AuthenticationService);
  private toastr = inject(ToastrService);
  private languageService = inject(LanguageService);
  private activeMeetingCall = inject(ActiveMeetingCallService);

  links = signal<MeetingLinkRow[]>([]);
  justCreatedLink = signal<string | null>(null);
  justCreatedLinkId = signal<number | null>(null);
  lobbyLink = signal<MeetingLinkRow | null>(null);
  titleDraft = '';
  expiresAtDraft: Date | null = null;

  lastLang: string;
  columnDefs: unknown[] = [];
  components = { meetingLinksActionsRenderer: MeetingLinksActionsRendererComponent };
  context = { componentParent: this };

  ngOnInit(): void {
    this.lastLang = this.languageService.currentLang;
    this.loadColumnDefs();
    this.languageService.onLangChange.subscribe((event) => {
      if (event.lang !== this.lastLang) {
        this.lastLang = event.lang;
        this.loadColumnDefs();
      }
    });
    this.refresh();
  }

  loadColumnDefs(): void {
    this.languageService
      .get([
        'meeting_links.join',
        'meeting_links.revoke',
        'meeting_links.copy',
        'meeting_links.active',
        'meeting_links.revoked',
        'meeting_links.column_name',
        'meeting_links.column_status',
        'meeting_links.column_actions',
        'guest_meeting.untitled',
      ])
      .subscribe((t) => {
        this.columnDefs = [
          {
            headerName: t['meeting_links.column_name'],
            field: 'title',
            flex: 2,
            cellRenderer: (params: { data: MeetingLinkRow }) => params.data.title || t['guest_meeting.untitled'],
          },
          {
            headerName: t['meeting_links.column_status'],
            field: 'status',
            flex: 1,
            cellRenderer: (params: { data: MeetingLinkRow }) => (params.data.revokedAt ? t['meeting_links.revoked'] : t['meeting_links.active']),
          },
          {
            headerName: t['meeting_links.column_actions'],
            field: 'actions',
            flex: 1,
            cellRenderer: 'meetingLinksActionsRenderer',
            cellRendererParams: { joinLabel: t['meeting_links.join'], revokeLabel: t['meeting_links.revoke'], copyLabel: t['meeting_links.copy'] },
          },
        ];
      });
  }

  refresh(): void {
    this.dataService.listMeetingLinks().subscribe({
      next: (links) => this.links.set(links),
      error: () => this.toastr.warning('Could not load meeting links'),
    });
  }

  create(): void {
    const expiresAt = this.expiresAtDraft ? this.expiresAtDraft.toISOString() : undefined;
    this.dataService.createMeetingLink({ title: this.titleDraft || undefined, expiresAt }).subscribe({
      next: (created) => {
        this.justCreatedLink.set(`${window.location.origin}/meet/${created.token}`);
        this.justCreatedLinkId.set(created.id);
        this.titleDraft = '';
        this.expiresAtDraft = null;
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
    await this.copyUrlToClipboard(url);
  }

  async copyLink(link: MeetingLinkRow): Promise<void> {
    if (!link.token) {
      this.toastr.warning('This link was created before copying was supported and can no longer be retrieved');
      return;
    }
    await this.copyUrlToClipboard(`${window.location.origin}/meet/${link.token}`);
  }

  private async copyUrlToClipboard(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.toastr.success('Link copied');
    } catch {
      this.toastr.warning('Could not copy link');
    }
  }

  joinOwnMeeting(link: MeetingLinkRow): void {
    this.lobbyLink.set(link);
  }

  hostDisplayName(): string {
    const user = this.auth.authDataSignal();
    return `${user.firstName}-${user.lastName}`;
  }

  onLobbyJoined(result: PreJoinResult, lobby?: PreJoinLobbyComponent): void {
    const link = this.lobbyLink();
    if (!link) {
      return;
    }
    const participantName = this.hostDisplayName();
    this.dataService.sendToken('/api/token', { roomName: link.roomName, participantName }).subscribe({
      next: (tokenResult) => {
        // Handed off to AdminComponent's own overlay (see ActiveMeetingCallService)
        // rather than rendered inline here, so the call survives navigating
        // away from this page instead of being destroyed with it.
        this.activeMeetingCall.start({
          livekitToken: tokenResult.token,
          roomName: link.roomName,
          displayName: participantName,
          videoTrack: result.videoTrack,
          audioTrack: result.audioTrack,
        });
        this.lobbyLink.set(null);
      },
      error: () => {
        this.toastr.warning('Could not join meeting');
        lobby?.resumeAfterFailedJoin();
      },
    });
  }

  clearExpiresAt(): void {
    this.expiresAtDraft = null;
  }
}
