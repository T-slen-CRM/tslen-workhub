import {
  Component,
  inject,
  NgZone,
  OnInit,
  Signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NextConfig } from '../../../app-config';
import { Location } from '@angular/common';
import {
  animate,
  animateChild,
  group,
  query,
  style,
  transition,
  trigger,
  useAnimation,
} from '@angular/animations';
import { ChildrenOutletContexts, Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { LiveKitWebSocketService } from '../../../pages/live-kit/live-kitWebSocket.service';
import { IncomingCallComponent } from '../../../components/incoming-call/incoming-call.componet';
import { LiveKitEvents } from '../../../pages/live-kit/enum/live-kit.enum';
import { LiveChatService } from '../../../tslen-components/live-chat/live-chat.service';
import { LoaderService } from '../../../services/loader.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  animations: [
    trigger('routeAnimations', [
      transition('* => *', [
        style({ position: 'relative' }),
        query(
          ':enter, :leave',
          [
            style({
              position: 'absolute',
              top: 60,
              left: 0,
              width: '100%',
            }),
          ],
          { optional: true },
        ),
        query(':enter', [style({ left: '100%' })], { optional: true }),
        query(':leave', animateChild(), { optional: true }),
        group([
          query(':leave', [animate('0.3s', style({ left: '-100%' }))], {
            optional: true,
          }),
          query(':enter', [animate('0.3s', style({ left: '0%' }))], {
            optional: true,
          }),
        ]),
        query(':enter', animateChild(), { optional: true }),
      ]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class AdminComponent implements OnInit {
  public nextConfig: any;
  public navCollapsed: boolean;
  public navCollapsedMob: boolean;
  public windowWidth: number;
  private dialogRef?: MatDialogRef<IncomingCallComponent>;
  private liveChatService: LiveChatService = inject(LiveChatService);
  public loaderService: LoaderService = inject(LoaderService);
  public activeCallData: Signal<{ callerId: number; calleeId: number }> =
    this.liveChatService.getActiveCallData();
  public showCall = false;
  public callMinimized = true;

  constructor(
    private location: Location,
    private contexts: ChildrenOutletContexts,
    private router: Router,
    private dialog: MatDialog,
    private liveKitWebSocketService: LiveKitWebSocketService,
  ) {
    this.nextConfig = NextConfig.config;
    let currentURL = this.location.path();
    const baseHerf = this.location['_baseHref'];
    if (baseHerf) {
      currentURL = baseHerf + this.location.path();
    }

    this.windowWidth = window.innerWidth;

    if (
      currentURL === baseHerf + '/layout/collapse-menu' ||
      currentURL === baseHerf + '/layout/box' ||
      (this.windowWidth >= 992 && this.windowWidth <= 1024)
    ) {
      this.nextConfig.collapseMenu = true;
    }

    this.navCollapsed =
      this.windowWidth >= 992 ? this.nextConfig.collapseMenu : false;
    this.navCollapsedMob = false;
    // Listen for incoming calls
    this.liveKitWebSocketService.incomingCall$.subscribe((data) => {
      this.handleIncomingCall(data);
    });
  }

  ngOnInit() {
    if (this.windowWidth < 992) {
      this.nextConfig.layout = 'vertical';
      setTimeout(() => {
        document
          .querySelector('.pcoded-navbar')
          .classList.add('menupos-static');
        (
          document.querySelector('#nav-ps-next') as HTMLElement
        ).style.maxHeight = '100%'; // 100% amit
      }, 500);
    }
  }

  navMobClick() {
    if (this.windowWidth < 992) {
      if (
        this.navCollapsedMob &&
        !document
          .querySelector('app-navigation.pcoded-navbar')
          .classList.contains('mob-open')
      ) {
        this.navCollapsedMob = !this.navCollapsedMob;
        setTimeout(() => {
          this.navCollapsedMob = !this.navCollapsedMob;
        }, 100);
      } else {
        this.navCollapsedMob = !this.navCollapsedMob;
      }
    }
  }

  getState(outlet) {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.[
      'animation'
    ];
  }

  handleIncomingCall(data: {
    callerId: string;
    callerName: string;
    calleeId: string;
    img: string;
    callerLastName: string;
  }) {
    localStorage.setItem('incoming_call', JSON.stringify(data));
    const audio = new Audio('assets/audio/call.mp3');
    audio.loop = true;
    audio.play().catch((error) => {
      console.error(error);
    });
    this.dialogRef = this.dialog.open(IncomingCallComponent, {
      disableClose: true,
      data: {
        callerId: data.callerId,
        callerName: data.callerName,
        callerLastName: data.callerLastName,
        img: data.img,
        audio,
      },
    });
    this.dialogRef.afterClosed().subscribe((accepted: boolean) => {
      this.dialogRef = undefined;
      audio.pause();
      audio.currentTime = 0;
      localStorage.removeItem('incoming_call');
      const payload = { callerId: data.callerId, calleeId: data.calleeId };
      if (accepted) {
        this.liveKitWebSocketService.send(LiveKitEvents.CALL_ACCEPTED, payload);
        this.liveChatService.setActiveCallData({
          callerId: +data.callerId,
          calleeId: +data.calleeId,
        });
        // this.router.navigate(['/pages/call', data.callerId, data.calleeId]);
      } else {
        this.liveKitWebSocketService.send(LiveKitEvents.CALL_REJECTED, payload);
      }
    });
  }

  onCloseCall() {
    this.liveChatService.setActiveCallData(null);
  }
}
