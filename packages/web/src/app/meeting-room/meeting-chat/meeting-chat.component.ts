import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

export interface MeetingChatMessage {
  senderName: string;
  text: string;
  ts: number;
}

/**
 * Presentational chat panel. It deliberately owns neither the message history
 * nor the LiveKit data-channel listener - both live in MeetingRoomComponent so
 * they survive this panel being hidden, and so an incoming message is never
 * dropped just because the panel was never opened.
 */
@Component({
  selector: 'app-meeting-chat',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  templateUrl: './meeting-chat.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './meeting-chat.component.css',
})
export class MeetingChatComponent {
  messages = input.required<MeetingChatMessage[]>();
  messageSent = output<string>();

  draft = '';

  send(): void {
    const text = this.draft.trim();
    if (!text) {
      return;
    }
    this.messageSent.emit(text);
    this.draft = '';
  }
}
