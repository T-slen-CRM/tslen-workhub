import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { IDaysOffObject } from '../../../interfaces/dashboard';
import {
  AuthData,
  AuthenticationService,
} from '../../../services/auth.service';
import { DataService } from '../../../services/data.service';
import { ThemeService } from '../../../services/theme.service';
import { getMonthDateRange } from '../../../helpers/utils';

@Component({
  selector: 'app-personal-schedule',
  templateUrl: './personal-schedule.component.html',
  styleUrls: ['./personal-schedule.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class PersonalScheduleComponent implements OnInit {
  public userId: number; // for test
  public isDarkTheme: boolean;
  public userData$: Observable<any>;
  public isLoadingEvents = signal(false);
  public usersList$: Observable<any>;
  public daysOffItems: IDaysOffObject;
  public daysOffKeys: string[];
  private authData: AuthData;

  constructor(
    private authService: AuthenticationService,
    private dataService: DataService,
    private themeService: ThemeService,
  ) {
    this.authData = this.authService.authDataSignal();
    this.userId = this.authData.id;
    this.daysOffItems = {
      hospital: {
        name: 'Hospital',
        value: 0,
        color: '#06acc1',
        icon: 'fa-solid fa-sack-dollar',
      },
      timeOff: {
        name: 'Time off',
        value: 0,
        color: '#06acc1',
        icon: 'fa-solid fa-hand-holding-dollar',
      },
      vocation: {
        name: 'Vocation',
        value: 0,
        color: '#06acc1',
        icon: 'fa fa-coins',
      },
    };
    this.daysOffKeys = Object.keys(this.daysOffItems);
  }

  ngOnInit() {
    this.fetchUserData(new Date());
    this.usersList$ = this.dataService.getObservableData('/users');
    this.themeService.isDarkTheme.subscribe((value) => {
      this.isDarkTheme = value;
    });
  }

  fetchUserData(date: Date) {
    const { startDate, endDate } = getMonthDateRange(
      date.getFullYear(),
      date.getMonth() + 1,
    );
    this.isLoadingEvents.set(true);
    this.userData$ = this.dataService
      .getObservableData(
        `/users/${this.userId}?startDate=${startDate}&endDate=${endDate}`,
      )
      .pipe(finalize(() => this.isLoadingEvents.set(false)));
  }

  onMonthChanged(date: Date) {
    this.fetchUserData(date);
  }
}
