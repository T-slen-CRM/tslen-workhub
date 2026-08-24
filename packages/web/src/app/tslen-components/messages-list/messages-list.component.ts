import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-messages-list',
  imports: [],
  templateUrl: './messages-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./messages-list.component.scss'],
})
export class MessagesListComponent {
  @Input() messages: string[];
}
