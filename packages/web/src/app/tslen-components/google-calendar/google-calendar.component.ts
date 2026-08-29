import {
  Component,
  inject,
  Input,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { DataService } from '../../services/data.service';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatPanelDynamicComponent } from '../mat-panel-dynamic/mat-panel-dynamic.component';
import { PanelDirective } from '../directives/panel.directive';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { BehaviorSubject, Subscription } from 'rxjs';
import { GoogleCalendarInfo } from '@tslen-workhub/shared';
import { UnsubscribeOnDestroyAdapter } from '../../helpers/UnsubscribeOnDestroyAdapter';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-google-calendar',
  imports: [
    CommonModule,
    MatButtonModule,
    MatInputModule,
    FormsModule,
    MatPanelDynamicComponent,
    PanelDirective,
    NgOptimizedImage,
    MatCheckboxModule,
    MatListModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  templateUrl: './google-calendar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./google-calendar.component.scss'],
})
export class GoogleCalendarComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit
{
  public dataService = inject(DataService);
  public calendarId: string;
  public calendarTimezone: string;
  @Input() public googleCalendarData$: BehaviorSubject<GoogleCalendarInfo>;
  ngOnInit() {
    this.calendarId = this.googleCalendarData$.getValue().calendarId;
    this.calendarTimezone = this.googleCalendarData$.getValue().timezone || '';
    const calendarData: Subscription = this.googleCalendarData$.subscribe(
      (data: GoogleCalendarInfo) => {
        this.calendarId = data.calendarId;
      },
    );
    this.subscription.add(calendarData);
  }

  googleAuth() {
    const postData: Subscription = this.dataService
      .getObservableData('/google-calendar/authorize')
      .subscribe((response: GoogleCalendarInfo) => {
        if (response.calendarId) {
          this.googleCalendarData$.next(response);
        }
      });
    this.subscription.add(postData);
  }
  resetAuth() {
    const calendarData = this.googleCalendarData$.getValue();
    const postData: Subscription = this.dataService
      .deleteData('/google-calendar/', calendarData.id)
      .subscribe((_deletedCalendarData: GoogleCalendarInfo) => {
        this.googleCalendarData$.next({} as GoogleCalendarInfo);
      });
    this.subscription.add(postData);
  }
}
