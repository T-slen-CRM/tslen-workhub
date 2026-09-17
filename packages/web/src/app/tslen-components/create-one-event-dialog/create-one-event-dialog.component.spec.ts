import { FormBuilder } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CreateOneEventDialogComponent } from './create-one-event-dialog.component';
import { LibsService } from '../../services/libs.service';
import { ValidatorFormGroupService } from '../../services/validatorFormGroup.service';
import { LanguageService } from 'src/app/language/language.service';
import { JoinOwnMeetingService } from '../../pages/live-kit/join-own-meeting.service';
import { IEventMeetingLink } from '../../interfaces/userConfig';

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
  function createComponent(events: object = {}, joinOwnMeetingServiceStub?: jasmine.SpyObj<JoinOwnMeetingService>): CreateOneEventDialogComponent {
    const dialogStub = {} as unknown as MatDialog;
    const dialogRefStub = {} as unknown as MatDialogRef<CreateOneEventDialogComponent>;
    const data = { events, daysOffList: {}, isRequest: 0 };
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
      (joinOwnMeetingServiceStub ?? jasmine.createSpyObj('JoinOwnMeetingService', ['join'])) as unknown as JoinOwnMeetingService,
    );
    component.createForm();
    return component;
  }

  // Runs the real ngOnInit (registers the start/end valueChanges
  // subscriptions checkDateTime-style tests don't need) - safe here only
  // because `events: []` (a brand-new event) skips the
  // `!Array.isArray(incomingEvent)` patchValue branch that would otherwise
  // need real start/end fields on the incoming event to avoid
  // customFormatDate(undefined, ...) throwing.
  function createNewEventComponentWithInit(date: Date, joinOwnMeetingServiceStub?: jasmine.SpyObj<JoinOwnMeetingService>): CreateOneEventDialogComponent {
    const component = createComponent([], joinOwnMeetingServiceStub);
    component.data.date = date;
    component.ngOnInit();
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

  describe('changeDateTimeByRequestType', () => {
    it('rounds down to the top of the current hour in hours mode, not the exact wall-clock time the dialog happened to open at', () => {
      const component = createComponent();
      component.selectedDate = '2026-09-16 14:51:11';

      component.changeDateTimeByRequestType(true);

      expect(component.form.value.start).toBe('2026-09-16 14:00:00');
      expect(component.form.value.end).toBe('2026-09-16 14:00:00');
    });

    it('strips the time entirely when not in hours mode', () => {
      const component = createComponent();
      component.selectedDate = '2026-09-16 14:51:11';

      component.changeDateTimeByRequestType(false);

      expect(component.form.value.start).toBe('2026-09-16');
      expect(component.form.value.end).toBe('2026-09-16');
    });
  });

  describe('30-minute default duration for a new event', () => {
    it('defaults the end time to 30 minutes after the clicked start time', () => {
      const component = createNewEventComponentWithInit(new Date('2026-09-14T14:00:00'));

      expect(component.form.value.start).toBe('2026-09-14 14:00:00');
      expect(component.form.value.end).toBe('2026-09-14 14:30:00');
    });

    it('keeps the 30-minute gap when the start time is changed before saving', () => {
      const component = createNewEventComponentWithInit(new Date('2026-09-14T14:00:00'));

      component.form.get('start').setValue('2026-09-14 15:00:00');

      expect(component.form.value.end).toBe('2026-09-14 15:30:00');
    });

    it('does not auto-adjust the end time when editing an existing event\'s start', () => {
      const component = createComponent({
        id: 5,
        start: '2026-09-14T09:00:00',
        end: '2026-09-14T11:00:00',
        attendees: [],
      });
      component.data.date = new Date('2026-09-14T09:00:00');
      component.ngOnInit();

      component.form.get('start').setValue('2026-09-14 10:00:00');

      expect(component.form.value.end).toBe('2026-09-14 11:00:00');
    });
  });

  describe('TSLen meet', () => {
    function activeLink(overrides: Partial<IEventMeetingLink> = {}): IEventMeetingLink {
      return { id: 5, roomName: 'meeting-abc', title: null, expiresAt: null, revokedAt: null, ...overrides };
    }

    it('has no meeting link for a brand-new event', () => {
      const component = createComponent();
      expect(component.meetingLink).toBeNull();
    });

    it('picks up the meeting link off an event being edited', () => {
      const component = createComponent({ meetingLink: activeLink() });
      expect(component.meetingLink).toEqual(activeLink());
    });

    it('joins the room via JoinOwnMeetingService when a link is present', () => {
      const joinOwnMeetingServiceStub = jasmine.createSpyObj('JoinOwnMeetingService', ['join']);
      const component = createComponent({ meetingLink: activeLink() }, joinOwnMeetingServiceStub);

      component.joinTslenMeet();

      expect(joinOwnMeetingServiceStub.join).toHaveBeenCalledWith('meeting-abc');
    });

    it('does nothing when there is no meeting link', () => {
      const joinOwnMeetingServiceStub = jasmine.createSpyObj('JoinOwnMeetingService', ['join']);
      const component = createComponent({}, joinOwnMeetingServiceStub);

      component.joinTslenMeet();

      expect(joinOwnMeetingServiceStub.join).not.toHaveBeenCalled();
    });
  });

  describe('syncTslenMeetCheckbox', () => {
    function activeLink(overrides: Partial<IEventMeetingLink> = {}): IEventMeetingLink {
      return { id: 5, roomName: 'meeting-abc', title: null, expiresAt: null, revokedAt: null, ...overrides };
    }

    it('checks and locks the checkbox when the event already has an active TSLen meet link', () => {
      const component = createComponent({ meetingLink: activeLink() });

      component.syncTslenMeetCheckbox();

      expect(component.form.get('createTslenMeet').value).toBe(1);
      expect(component.form.get('createTslenMeet').disabled).toBe(true);
    });

    it('leaves the checkbox unchecked and enabled for a brand-new event', () => {
      const component = createComponent();

      component.syncTslenMeetCheckbox();

      expect(component.form.get('createTslenMeet').value).toBe(0);
      expect(component.form.get('createTslenMeet').disabled).toBe(false);
    });

    it('leaves the checkbox unchecked and enabled when the meeting link was revoked', () => {
      const component = createComponent({ meetingLink: activeLink({ revokedAt: '2026-09-10T00:00:00.000Z' }) });

      component.syncTslenMeetCheckbox();

      expect(component.form.get('createTslenMeet').value).toBe(0);
      expect(component.form.get('createTslenMeet').disabled).toBe(false);
    });
  });
});
