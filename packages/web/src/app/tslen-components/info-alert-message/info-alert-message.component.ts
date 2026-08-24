import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-info-alert-message',
  imports: [MatIconModule],
  templateUrl: './info-alert-message.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./info-alert-message.component.scss'],
})
export class InfoAlertMessageComponent {
  @Input() public message: string;
}
