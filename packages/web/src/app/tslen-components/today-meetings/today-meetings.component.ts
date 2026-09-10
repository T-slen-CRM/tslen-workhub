import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { map, Observable } from 'rxjs';
import { DataService } from '../../services/data.service';
import { AuthenticationService } from '../../services/auth.service';
import { getTodayDateRange } from '../../helpers/utils';
import { IEventByUser, UserGeneralData } from '../../interfaces/userConfig';
import { TranslateModule } from '@ngx-translate/core';

// Main Wall's "Today's meetings" sidebar widget - the user's own real
// calendar events for today (isRequest false), not day-off requests, which
// share the same eventsByUser table (see IEventByUser).
@Component({
  selector: 'app-today-meetings',
  imports: [CommonModule, TranslateModule],
  templateUrl: './today-meetings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './today-meetings.component.scss',
})
export class TodayMeetingsComponent implements OnInit {
  public events$: Observable<IEventByUser[]>;

  private dataService = inject(DataService);
  private authService = inject(AuthenticationService);

  ngOnInit(): void {
    const userId = this.authService.authDataSignal().id;
    const { startDate, endDate } = getTodayDateRange();

    this.events$ = this.dataService
      .getObservableData(
        `/users/${userId}?startDate=${startDate}&endDate=${endDate}`,
      )
      .pipe(
        map((user: UserGeneralData) =>
          (user.eventsByUsers ?? [])
            .filter((event) => !event.isRequest)
            .sort(
              (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
            ),
        ),
      );
  }
}
