import {Component, Input} from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatIconModule} from "@angular/material/icon";

@Component({
    selector: 'app-info-alert-message',
    imports: [CommonModule, MatIconModule],
    templateUrl: './info-alert-message.component.html',
    styleUrls: ['./info-alert-message.component.scss']
})
export class InfoAlertMessageComponent {
  @Input() public message: string;

}
