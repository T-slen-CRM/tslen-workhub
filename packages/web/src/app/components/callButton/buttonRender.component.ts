import {Component, input, OnInit} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ModalLiveKit } from '../model-live-kit/model-live-kit.component';
import { DataService } from 'src/app/services/data.service';
import { AuthenticationService } from 'src/app/services/auth.service';
import { TranslateModule } from '@ngx-translate/core';
import { LiveKitWebSocketService } from 'src/app/pages/live-kit/live-kitWebSocket.service';
import { LiveKitEvents } from 'src/app/pages/live-kit/enum/live-kit.enum';
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";

@Component({
    selector: 'app-call-button-renderer',
    imports: [TranslateModule, MatButtonModule, MatIconModule],
    templateUrl: './buttonRender.component.html',
    styleUrls: ['./buttonRender.component.scss']
})
export class CallButtonRendererComponent implements OnInit {
  params: any;
  block: boolean;
  public user = this.auth.authDataSignal();
  public selectedUserId = input<number>();

  constructor(
    private dialog: MatDialog,
    private dataService: DataService,
    private auth: AuthenticationService,
    public liveKitWebSocketService: LiveKitWebSocketService
  ) {}

  ngOnInit() {
    const activeCall = localStorage.getItem('outgoing_call');

    if (activeCall) {
      const payload = JSON.parse(activeCall);
      if (payload.callerId === this.user.id && payload.calleeId) {
        this.dataService.getOneUser(payload.calleeId).subscribe((res) => {
          this.callModal(res, payload)
        });
      }
    }
  }

  refresh(): boolean {
    return false;
  }

  call() {
    const payload = {
      type: 'incoming_call',
      callerId: this.user.id,
      callerName: this.user.firstName,
      callerLastName: this.user.lastName,
      calleeId: this.selectedUserId(),
      img: this.user.avatar
    };
    localStorage.setItem('outgoing_call', JSON.stringify(payload));

    this.dataService.getOneUser(this.selectedUserId()).subscribe((res) => {
       this.callModal(res, payload)
    });
    this.liveKitWebSocketService.send(LiveKitEvents.INCOMING_CALL, payload);
  }


  private callModal(res, payload){
    const audio = new Audio('assets/audio/call.mp3');
    audio.loop = true;
    audio.play();

    const dialogRef = this.dialog.open(ModalLiveKit, {
      disableClose: true,
      data: res.body
    });
    this.liveKitWebSocketService.registerOutgoingCallDialog(dialogRef);
    dialogRef.afterClosed().subscribe((wasAccepted?: boolean) => {
      audio.pause();
      audio.currentTime = 0;
      localStorage.removeItem('outgoing_call');
      if (wasAccepted) {
        return;
      }
      const data_rejected = {
        callerId: payload.calleeId,
        calleeId: payload.callerId
      };
      this.liveKitWebSocketService.send(LiveKitEvents.CALL_REJECTED, data_rejected);
    });
  }
}

