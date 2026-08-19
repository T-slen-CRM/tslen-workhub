import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  displayEndTimeFn,
  displayTimeLeftFn,
  nowToFn,
} from '../helpers/timer-pane.helper';
import {MatButtonModule} from "@angular/material/button";
import {TimerButtonDirective} from "../directive/timer-button.directive";
import {tap} from "rxjs";

@Component({
    selector: 'app-timer-pane',
    imports: [AsyncPipe, MatButtonModule, TimerButtonDirective],
    template: `
    <div class="display">
        @if (displayTimeLeft$ | async; as displayTimeLeft) {
          <button mat-stroked-button
                    class="make-request-btn display__end-time" (click)="timeOff = false">{{ displayTimeLeft }}</button>
            @if (timeOff) {
                <audio src="../../../../assets/audio/timer.wav" autoplay></audio>
            }
        }
      
<!--      <p class="display__end-time">{{ displayEndTime$ | async }}</p>-->
    </div>
  `,
    styles: [
        `
      .display {
        /*flex: 1;*/
        display: flex;
        /*flex-direction: column;*/
        align-items: center;
        justify-content: center;
      }

      .display__time-left {
        /*font-weight: 100;*/
        /*font-size: 20rem;*/
        margin: 0;
        color: black;
        text-shadow: 4px 4px 0 rgba(0, 0, 0, 0.05);
      }

      .display__end-time {
        /*font-size: 4rem;*/
        color: red;
      }
    `,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimerPaneComponent {
  constructor() {
    // this.requestNotificationPermission();
  }
  timeOff = false;
  nowTo$ = nowToFn();
  displayEndTime$ = displayEndTimeFn(this.nowTo$);
  displayTimeLeft$ = displayTimeLeftFn(this.nowTo$).pipe(
      tap((timeLeft) => {
        if (timeLeft === '0:00') {
          this.timeOff = true;
          this.requestNotificationPermission();
        }
      })
  )
  requestNotificationPermission() {
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          this.showNotification();
        } else {
        }
      });
    }
  }
  showNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Timer Finished', {
        body: 'Your timer has ended!',
        icon: 'assets/timer-icon.png' // Optional: add an icon for the notification
      });
    }
  }
}
