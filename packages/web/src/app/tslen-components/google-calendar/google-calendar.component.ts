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
import { IGoogleCalendarData } from '../../interfaces/google-api';
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
  public calendarTimezone: number;
  @Input() public googleCalendarData$: BehaviorSubject<IGoogleCalendarData>;
  ngOnInit() {
    this.calendarId = this.googleCalendarData$.getValue().calendarId;
    this.calendarTimezone = this.googleCalendarData$.getValue().timezone || 0;
    const calendarData: Subscription = this.googleCalendarData$.subscribe(
      (data: IGoogleCalendarData) => {
        this.calendarId = data.calendarId;
      },
    );
    this.subscription.add(calendarData);
  }

  googleAuth() {
    const postData: Subscription = this.dataService
      .getObservableData('/google-calendar/authorize')
      .subscribe((response: IGoogleCalendarData) => {
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
      .subscribe((deletedCalendarData: IGoogleCalendarData) => {
        this.googleCalendarData$.next({} as IGoogleCalendarData);
      });
    this.subscription.add(postData);
  }
}
