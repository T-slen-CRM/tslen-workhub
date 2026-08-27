import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslateModule } from '@ngx-translate/core';
import { CallUsersOnlineComponent } from '../../components/table-live-kit/table-live-kit.component';
import { LiveChatComponent } from '../../tslen-components/live-chat/component/live-chat.component';
import { CallComponent } from '../call/wellcome/call.component';
import { MeetingLinksManagerComponent } from '../meeting-links/meeting-links-manager.component';

@Component({
  selector: 'app-live-kit',
  templateUrl: './live-kit.component.html',
  styleUrls: ['./live-kit.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    MatTabsModule,
    TranslateModule,
    CallUsersOnlineComponent,
    LiveChatComponent,
    CallComponent,
    MeetingLinksManagerComponent,
  ],
})
export class LiveKitComponent {}
