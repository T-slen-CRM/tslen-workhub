import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { CommonScheduleComponent } from './common-schedule.component';
import { DataService } from '../../../services/data.service';
import { AuthenticationService } from '../../../services/auth.service';
import { LanguageService } from '../../../language/language.service';

describe('CommonScheduleComponent', () => {
  let component: CommonScheduleComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DataService, useValue: {} },
        { provide: AuthenticationService, useValue: { authData: { id: 1 } } },
        {
          provide: LanguageService,
          useValue: { currentLang: 'en', onLangChange: new Subject(), get: () => of({}) },
        },
      ],
    });

    component = TestBed.runInInjectionContext(() => new CommonScheduleComponent(
      TestBed.inject(DataService),
      TestBed.inject(AuthenticationService),
      TestBed.inject(LanguageService),
    ));
  });

  describe('getDatesForRequest', () => {
    it('returns the exact last day of the month via UTC math, not local-time endOfMonth on a UTC-parsed string', () => {
      component.year = 2026;
      component.month = 8;

      const { startDate, endDate } = component.getDatesForRequest();

      expect(startDate).toBe('2026-08-01');
      expect(endDate).toBe('2026-08-31');
    });

    it('handles a 30-day month correctly', () => {
      component.year = 2026;
      component.month = 4;

      const { endDate } = component.getDatesForRequest();

      expect(endDate).toBe('2026-04-30');
    });

    it('handles December -> next year rollover', () => {
      component.year = 2026;
      component.month = 12;

      const { startDate, endDate } = component.getDatesForRequest();

      expect(startDate).toBe('2026-12-01');
      expect(endDate).toBe('2026-12-31');
    });
  });

  describe('addExtensionDays', () => {
    it('leaves a single-day event (dateDiff 1) as one entry, using the UTC day-of-month', () => {
      component.month = 8;
      const events = [
        { id: 1, dateDiff: 1, start: '2026-08-29T00:00:00.000Z', end: '2026-08-29T23:59:00.000Z', requestType: 'vocation' },
      ];

      const result = component.addExtensionDays(events);

      expect(result.length).toBe(1);
      expect(result[0].monthDay).toBe(29);
    });

    it('expands a multi-day event (dateDiff > 1) into one entry per UTC calendar day', () => {
      component.month = 8;
      const events = [
        { id: 1, dateDiff: 3, start: '2026-08-29T00:00:00.000Z', end: '2026-08-31T23:59:00.000Z', requestType: 'vocation' },
      ];

      const result = component.addExtensionDays(events);

      expect(result.map((e) => e.monthDay)).toEqual([29, 30, 31]);
    });

    it('drops expanded days that fall outside the currently-viewed month', () => {
      component.month = 9;
      const events = [
        { id: 1, dateDiff: 2, start: '2026-08-31T00:00:00.000Z', end: '2026-09-01T23:59:00.000Z', requestType: 'vocation' },
      ];

      const result = component.addExtensionDays(events);

      expect(result.length).toBe(1);
      expect(result[0].monthDay).toBe(1);
    });
  });
});
