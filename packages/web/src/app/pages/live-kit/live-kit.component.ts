import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CallUsersOnlineComponent } from '../../components/table-live-kit/table-live-kit.component';
import { LiveChatComponent } from '../../tslen-components/live-chat/component/live-chat.component';
import { CallComponent } from '../call/wellcome/call.component';

@Component({
  selector: 'app-live-kit',
  templateUrl: './live-kit.component.html',
  styleUrls: ['./live-kit.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CallUsersOnlineComponent, LiveChatComponent, CallComponent],
})
export class LiveKitComponent {}
