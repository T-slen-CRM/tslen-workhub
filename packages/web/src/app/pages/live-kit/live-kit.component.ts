import {Component, inject, OnInit, Signal} from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import {Router, RouterOutlet} from '@angular/router';
import { IncomingCallComponent } from 'src/app/components/incoming-call/incoming-call.componet';
import { LiveKitWebSocketService } from './live-kitWebSocket.service';
import { LiveKitEvents } from './enum/live-kit.enum';
import {CallUsersOnlineComponent} from "../../components/table-live-kit/table-live-kit.component";
import {LiveChatComponent} from "../../tslen-components/live-chat/component/live-chat.component";
import {CallComponent} from "../call/wellcome/call.component";
import {LiveChatService} from "../../tslen-components/live-chat/live-chat.service";

@Component({
    selector: 'app-live-kit',
    templateUrl: './live-kit.component.html',
    styleUrls: ['./live-kit.component.scss'],
    imports: [
        CallUsersOnlineComponent,
        LiveChatComponent,
        CallComponent
    ]
})
export class LiveKitComponent{

}
