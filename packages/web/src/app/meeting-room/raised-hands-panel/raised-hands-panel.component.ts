import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

export interface RaisedHandEntry {
  identity: string;
  name: string;
  ts: number;
}

/**
 * Presentational panel listing who currently has a hand raised, in the
 * order they raised it. Owns no state itself - the raised-hand list lives
 * in MeetingRoomComponent (built from LiveKit data-channel events), so
 * unlike the chat panel this one is safe to mount/unmount with the
 * open/closed toggle instead of staying mounted-but-hidden.
 */
@Component({
  selector: 'app-raised-hands-panel',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './raised-hands-panel.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './raised-hands-panel.component.css',
})
export class RaisedHandsPanelComponent {
  entries = input.required<RaisedHandEntry[]>();
}
