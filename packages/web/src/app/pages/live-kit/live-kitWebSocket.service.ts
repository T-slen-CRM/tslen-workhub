import {inject, Injectable, signal, WritableSignal} from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { ConfigurationService } from '../../services/ConfigurationService';
import { AuthenticationService } from 'src/app/services/auth.service';
import { LiveKitEvents } from './enum/live-kit.enum';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { Subject, filter, take } from 'rxjs';
import {LiveChatService} from "../../tslen-components/live-chat/live-chat.service";

@Injectable({
  providedIn: 'root',
})
export class LiveKitWebSocketService {
  private socket: Socket;

  private onlineStatusSignalInternal: WritableSignal<{ [userId: string]: boolean }> = signal({});
  public readonly onlineStatusSignal = this.onlineStatusSignalInternal;
  public readonly onlineStatus$ = toObservable(this.onlineStatusSignalInternal);

  private incomingCall = new Subject<any>();
  public readonly incomingCall$ = this.incomingCall.asObservable();
  private notification = new Subject<any>();
  public readonly notification$ = this.notification.asObservable();
  private liveChatService = inject(LiveChatService);

  constructor(
    private configService: ConfigurationService,
    private authService: AuthenticationService,
    private router: Router,
    private dialog: MatDialog,
  ) {
    this.connect();
  }

  private connect(): void {
    const jwtToken = localStorage.getItem('jwtToken');
    const url = this.configService.getApiHost(false);

    const socketOptions = {
      extraHeaders: {
        authorization: `Bearer ${jwtToken}`,
      },
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
    };

    // Wait for valid auth data (with id) before connecting
    toObservable(this.authService.authDataSignal).pipe(
      filter(auth => !!auth?.id),
      take(1)
    ).subscribe(authData => {
      this.socket = io(`${url}/live-kit`, socketOptions);

      this.socket.on('connect', () => {
        this.send(LiveKitEvents.REGISTER, { userId: authData.id });
      });

      this.registerSocketListeners();
    });
  }

  private registerSocketListeners(): void {
    this.socket.on(LiveKitEvents.ONLINE_USERS, (data) => {
      let online;
      try {
        online = JSON.parse(data);
      } catch (e) {
        console.error('❌ JSON parse error:', e);
        return;
      }

      const statusMap: { [userId: string]: boolean } = {};
      for (const id of online.users) {
        statusMap[id] = true;
      }

      this.onlineStatusSignalInternal.set(statusMap);

      const savedCall = localStorage.getItem('incoming_call');
      if (savedCall) {
        try {
          const callData = JSON.parse(savedCall);
          this.incomingCall.next(callData);
        } catch (e) {
          console.error('❌ Error parsing incoming_call from localStorage:', e);
        }
      }
    });

    this.socket.on(LiveKitEvents.INCOMING_CALL, (data) => {
      this.incomingCall.next(data);
    });

    this.socket.on(LiveKitEvents.CALL_ACCEPTED, (data) => {
      const { callerId, calleeId } = data;
      console.warn('[LiveKit] socket CALL_ACCEPTED received (caller side):', data);
      if (callerId && calleeId) {
        this.dialog.closeAll();
        this.liveChatService.setActiveCallData({callerId, calleeId});
        // this.router.navigate(['/pages/call', callerId, calleeId]);
      } else {
        this.liveChatService.setActiveCallData(null);
        console.error('⚠️ Invalid CALL_ACCEPTED data', data);
      }
    });

    this.socket.on(LiveKitEvents.CALL_REJECTED, () => {
      this.dialog.closeAll();
      // this.liveChatService.setActiveCallData(null);
    });

    this.socket.on(LiveKitEvents.NOTIFICATION, (data: any) => {
      this.notification.next(data);
    });
  }

  send(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ Socket not connected. Cannot send event:', event);
    }
  }
}
