import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { of, Subject } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { TranslateModule } from '@ngx-translate/core';
import { CommonScheduleComponent } from './common-schedule.component';
import { DataService } from '../../../services/data.service';
import { AuthenticationService } from '../../../services/auth.service';
import { LanguageService } from '../../../language/language.service';
import { AgGridTableComponent } from '../../../components/ag-grid-table/ag-grid-table.component';

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

  describe('day grid responsiveness', () => {
    // Stubs the real angular-calendar CalendarDatePipe ('calendarDate') so
    // this test doesn't have to pull in CalendarModule.forRoot() and its
    // date-adapter factory just to render the ag-grid columns below it.
    @Pipe({ name: 'calendarDate' })
    class StubCalendarDatePipe implements PipeTransform {
      transform(value: unknown): unknown {
        return value;
      }
    }

    let fixture: ComponentFixture<CommonScheduleComponent>;

    beforeEach(async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        declarations: [CommonScheduleComponent, AgGridTableComponent],
        imports: [TranslateModule.forRoot(), StubCalendarDatePipe],
        providers: [
          { provide: DataService, useValue: { getObservableData: () => of([]) } },
          { provide: AuthenticationService, useValue: { authData: { id: 1 } } },
          {
            provide: LanguageService,
            useValue: { currentLang: 'en', onLangChange: new Subject(), get: () => of({}) },
          },
        ],
        // mwl-calendar-month-view / app-calendar-dayoff-window aren't relevant
        // to the ag-grid day columns' sizing - stub them out rather than
        // pulling in the whole angular-calendar module for this test.
        schemas: [NO_ERRORS_SCHEMA],
      }).compileComponents();

      fixture = TestBed.createComponent(CommonScheduleComponent);
    });

    // Day columns were fixed at width: 10 with no flex and no
    // sizeColumnsToFit on the wrapper, so the whole month grid stayed a
    // few hundred pixels wide regardless of screen size - this is the
    // "calendar isn't full-width on a large monitor" report.
    it('sizes the day-off grid columns to fit the container instead of staying fixed-width', () => {
      fixture.detectChanges();

      const grid = fixture.debugElement.query(By.directive(AgGridTableComponent));

      expect(grid.componentInstance.sizeColumnsToFit()).toBeTrue();
    });
  });

  describe('day-off calendar event category translations', () => {
    // These are the literal `category` values the calendar-day-off window
    // looks up as `'model_transltate.' + category` (calendar-dayoff-window.component.html) -
    // every one of them needs a matching key under model_transltate in every
    // locale file, or the UI shows the raw, untranslated key string.
    const categories = ['Absent', 'Probation', 'New employee', 'Birthdays', 'Anniversary'];
    const locales = ['en', 'ru', 'uk', 'fr', 'es'];

    for (const locale of locales) {
      it(`has a model_transltate.<category> key for every event category in ${locale}.json`, () => {
        const translations = JSON.parse(
          fs.readFileSync(path.join(__dirname, `../../../../assets/i18n/${locale}.json`), 'utf8'),
        );

        for (const category of categories) {
          expect(translations.model_transltate?.[category]).toBeDefined();
        }
      });
    }
  });
});
