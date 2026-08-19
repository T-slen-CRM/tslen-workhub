import {Component, Input} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-messages-list',
    imports: [CommonModule],
    templateUrl: './messages-list.component.html',
    styleUrls: ['./messages-list.component.scss']
})
export class MessagesListComponent {
  @Input() messages: string[];
}
