import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { MainCalendarComponent } from './main-calendar.component';
import { DataService } from '../../../services/data.service';
import { LanguageService } from 'src/app/language/language.service';

describe('MainCalendarComponent', () => {
  let component: MainCalendarComponent;

  beforeEach(() => {
    component = new MainCalendarComponent(
      {} as MatDialog,
      {} as DataService,
      {} as ToastrService,
      {} as LanguageService,
    );
  });

  describe('onViewDateChange', () => {
    it('emits monthChanged with the current viewDate', () => {
      const emitted: Date[] = [];
      component.monthChanged.subscribe((date) => emitted.push(date));
      component.viewDate = new Date('2026-07-01T00:00:00.000Z');

      component.onViewDateChange();

      expect(emitted).toEqual([new Date('2026-07-01T00:00:00.000Z')]);
    });

    it('still closes an open month-view day cell when navigating', () => {
      component.activeDayIsOpen = true;

      component.onViewDateChange();

      expect(component.activeDayIsOpen).toBe(false);
    });
  });
});
