import { of, BehaviorSubject } from 'rxjs';
import { PersonalScheduleComponent } from './personal-schedule.component';
import { DataService } from '../../../services/data.service';
import { AuthenticationService } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme.service';

describe('PersonalScheduleComponent', () => {
  let component: PersonalScheduleComponent;
  let dataService: jasmine.SpyObj<DataService>;

  beforeEach(() => {
    dataService = jasmine.createSpyObj('DataService', ['getObservableData']);
    dataService.getObservableData.and.returnValue(of({}));
    const authService = {
      authDataSignal: () => ({ id: 42 }),
    } as unknown as AuthenticationService;
    const themeService = {
      isDarkTheme: new BehaviorSubject(false),
    } as unknown as ThemeService;

    component = new PersonalScheduleComponent(
      authService,
      dataService as unknown as DataService,
      themeService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("fetches the current month's events, scoped by date range, on init", () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-15T00:00:00.000Z'));

    component.ngOnInit();

    expect(dataService.getObservableData).toHaveBeenCalledWith(
      '/users/42?startDate=2026-06-01&endDate=2026-06-30',
    );
  });

  it('refetches the newly navigated month when the calendar emits monthChanged', () => {
    component.ngOnInit();
    dataService.getObservableData.calls.reset();

    component.onMonthChanged(new Date('2026-07-10T00:00:00.000Z'));

    expect(dataService.getObservableData).toHaveBeenCalledWith(
      '/users/42?startDate=2026-07-01&endDate=2026-07-31',
    );
  });
});
