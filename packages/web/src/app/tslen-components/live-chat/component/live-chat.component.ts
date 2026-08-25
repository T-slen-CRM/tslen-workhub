import {
  Component,
  inject,
  Signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { LiveChatService } from '../live-chat.service';
import { UserGeneralData } from '../../../interfaces/userConfig';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { CallButtonRendererComponent } from '../../../components/callButton/buttonRender.component';
import { AuthenticationService } from '../../../services/auth.service';
import { ChatComponent } from '../../../pages/chat/chat.component';

@Component({
  selector: 'app-live-chat',
  imports: [
    MatButtonModule,
    MatInputModule,
    CallButtonRendererComponent,
    ChatComponent,
  ],
  templateUrl: './live-chat.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './live-chat.component.scss',
})
export class LiveChatComponent {
  public selectedChatId: Signal<UserGeneralData>;
  private liveChatService = inject(LiveChatService);
  protected localUserData = inject(AuthenticationService).authDataSignal;
  public chatRoomId: Signal<string>;
  constructor() {
    this.selectedChatId = this.liveChatService.getSelectedChatId();
    this.chatRoomId = computed(() => {
      const localUserId = this.localUserData()?.id;
      const remoteUserId = this.selectedChatId()?.id;
      // sort the IDs to ensure consistent chat room ID
      if (!localUserId || !remoteUserId) {
        return '';
      }
      const sortedIds = [+localUserId, +remoteUserId].sort((a, b) => a - b);
      return `${sortedIds[0]}_${sortedIds[1]}`;
    });
  }
}
