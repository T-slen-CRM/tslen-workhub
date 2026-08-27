import { Component, ChangeDetectionStrategy } from '@angular/core';

interface MeetingLinkRow {
  id: number;
  title: string | null;
  roomName: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  token: string | null;
}

interface MeetingLinksGridParent {
  joinOwnMeeting(link: MeetingLinkRow): void;
  revoke(id: number): void;
  copyLink(link: MeetingLinkRow): void;
}

@Component({
  selector: 'app-meeting-links-actions-renderer',
  template: `
    <button mat-button [disabled]="!hasToken" (click)="copy()">{{ copyLabel }}</button>
    @if (!revoked) {
      <button mat-button color="primary" (click)="join()">{{ joinLabel }}</button>
      <button mat-button color="warn" (click)="revokeLink()">{{ revokeLabel }}</button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class MeetingLinksActionsRendererComponent {
  params: { data: MeetingLinkRow; context: { componentParent: MeetingLinksGridParent }; joinLabel?: string; revokeLabel?: string; copyLabel?: string };
  revoked = false;
  hasToken = false;
  joinLabel = 'Join';
  revokeLabel = 'Revoke';
  copyLabel = 'Copy';

  agInit(params: MeetingLinksActionsRendererComponent['params']): void {
    this.params = params;
    this.revoked = !!params.data.revokedAt;
    this.hasToken = !!params.data.token;
    this.joinLabel = params.joinLabel ?? this.joinLabel;
    this.revokeLabel = params.revokeLabel ?? this.revokeLabel;
    this.copyLabel = params.copyLabel ?? this.copyLabel;
  }

  join(): void {
    this.params.context.componentParent.joinOwnMeeting(this.params.data);
  }

  revokeLink(): void {
    this.params.context.componentParent.revoke(this.params.data.id);
  }

  copy(): void {
    this.params.context.componentParent.copyLink(this.params.data);
  }
}
