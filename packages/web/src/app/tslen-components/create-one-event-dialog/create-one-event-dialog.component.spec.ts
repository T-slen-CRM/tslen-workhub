import { FormBuilder } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CreateOneEventDialogComponent } from './create-one-event-dialog.component';
import { LibsService } from '../../services/libs.service';
import { ValidatorFormGroupService } from '../../services/validatorFormGroup.service';
import { LanguageService } from 'src/app/language/language.service';

/**
 * checkDateTime() is exercised directly against a component instance built
 * with plain stand-in dependencies (FormBuilder is real - it has no
 * dependencies of its own) rather than through TestBed, since none of these
 * constructor params are `inject()`-based and checkDateTime() only touches
 * `this.form`. This mirrors the "mock service dependencies directly rather
 * than pulling in the real providers" pattern used elsewhere in this repo
 * for isolating a component's logic from its full DI graph.
 */
describe('CreateOneEventDialogComponent', () => {
  function createComponent(): CreateOneEventDialogComponent {
    const dialogStub = {} as unknown as MatDialog;
    const dialogRefStub = {} as unknown as MatDialogRef<CreateOneEventDialogComponent>;
    const data = { events: {}, daysOffList: {}, isRequest: 0 };
    const libsServiceStub = {
      requestTypeList: [],
      daysOffList: {},
      approveStatusList: {},
    } as unknown as LibsService;
    const validatorServiceStub = { requireStartBeforeEnd: () => () => null } as unknown as ValidatorFormGroupService;
    const translateServiceStub = {
      onLangChange: { subscribe: jasmine.createSpy('subscribe') },
      get: jasmine.createSpy('get').and.returnValue({ subscribe: jasmine.createSpy('subscribe') }),
    } as unknown as LanguageService;

    const component = new CreateOneEventDialogComponent(
      dialogStub,
      dialogRefStub,
      data,
      new FormBuilder(),
      libsServiceStub,
      validatorServiceStub,
      translateServiceStub,
    );
    component.createForm();
    return component;
  }

  describe('checkDateTime', () => {
    it('turns a single-day request into a 00:00:00-23:59:00 range on the SAME calendar day - regardless of how new Date() would parse the bare date string', () => {
      const component = createComponent();
      component.form.patchValue({ isRequest: 1, dateWithHours: 0, start: '2026-08-29', end: '2026-08-29' });

      component.checkDateTime();

      expect(component.form.value.start).toBe('2026-08-29 00:00:00');
      expect(component.form.value.end).toBe('2026-08-29 23:59:00');
    });

    it('preserves each boundary day for a multi-day request', () => {
      const component = createComponent();
      component.form.patchValue({ isRequest: 1, dateWithHours: 0, start: '2026-08-29', end: '2026-08-31' });

      component.checkDateTime();

      expect(component.form.value.start).toBe('2026-08-29 00:00:00');
      expect(component.form.value.end).toBe('2026-08-31 23:59:00');
    });

    it('does nothing for an hourly request (dateWithHours set)', () => {
      const component = createComponent();
      component.form.patchValue({ isRequest: 1, dateWithHours: 1, start: '2026-08-29 09:00:00', end: '2026-08-29 13:00:00' });

      component.checkDateTime();

      expect(component.form.value.start).toBe('2026-08-29 09:00:00');
      expect(component.form.value.end).toBe('2026-08-29 13:00:00');
    });

    it('does nothing when the event is not a days-off request', () => {
      const component = createComponent();
      component.form.patchValue({ isRequest: 0, dateWithHours: 0, start: '2026-08-29', end: '2026-08-29' });

      component.checkDateTime();

      expect(component.form.value.start).toBe('2026-08-29');
      expect(component.form.value.end).toBe('2026-08-29');
    });
  });
});
