import {
  Component,
  Inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { CalendarEvent } from 'angular-calendar';
import { Subject } from 'rxjs';
import { customFormatDate } from '../../helpers/utils';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LibsService } from '../../services/libs.service';
import { IDaysOffObject } from '../../interfaces/dashboard';
import {
  FadeIn,
  FadeInOut,
  FadeInOutByHidden,
} from '../../../animations/animations';
import { ValidatorFormGroupService } from '../../services/validatorFormGroup.service';
import { LanguageService } from 'src/app/language/language.service';

/**
 * @title Dialog with header, scrollable content and actions
 */
@Component({
  selector: 'app-create-one-event-dialog',
  templateUrl: './create-one-event-dialog.component.html',
  styleUrls: ['./create-one-event-dialog.component.scss'],
  animations: [
    FadeInOutByHidden(300, 300, true),
    FadeInOut(500, 300, true),
    FadeIn(500, true),
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class CreateOneEventDialogComponent implements OnInit {
  // TODO: interface
  public refresh = new Subject<void>();
  public selectedDate: any;
  public requestTypes: object[];
  public iconsListByRequestTypes: object;
  public form: FormGroup;
  public approvingStatus: string;
  public approveStatusObject: object;
  public incomingEvent: CalendarEvent[];
  public daysOffList: IDaysOffObject;
  public isRequest: number;
  public googleCalendarId: string;
  public googleTimezone: number;
  public showDaysOffList = false;
  public usersList: any;
  public userListByEmail: any;
  public allPossibleAttendees: any;
  public selectedAttendees: any;

  constructor(
    public dialog: MatDialog,
    public matDialogRef: MatDialogRef<CreateOneEventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private formBuilder: FormBuilder,
    private libsService: LibsService,
    private validatorService: ValidatorFormGroupService,
    public translateService: LanguageService,
  ) {
    this.requestTypes = this.libsService.requestTypeList;
    this.iconsListByRequestTypes = this.libsService.daysOffList;
    this.approveStatusObject = this.libsService.approveStatusList;
    this.incomingEvent = this.data.events;
    this.daysOffList = this.data.daysOffList;
    this.isRequest = this.data.isRequest;
    this.googleCalendarId = this.data.googleCalendarData?.calendarId;
    this.googleTimezone = this.data.googleCalendarData?.timezone;
    this.usersList = this.data.usersList;
    if (this.usersList) {
      this.userListByEmail = Object.fromEntries(
        this.usersList.map((user) => [user.email, user]),
      );
      this.allPossibleAttendees = this.getAllPossibleAttendees(this.usersList);
    }
  }

  ngOnInit() {
    this.loadTranslations();
    this.translateService.onLangChange.subscribe(() => this.loadTranslations());
    this.selectedDate = customFormatDate(
      this.data?.date,
      'yyyy-MM-dd HH:mm:ss',
    ); // if edit event use new Date()
    this.createForm();
    const incomingEvent = this.data.events;
    this.selectedAttendees = this.setSelectedAttendees(incomingEvent.attendees);
    if (incomingEvent && !Array.isArray(incomingEvent)) {
      const event = Object.assign({}, incomingEvent);
      event.start = customFormatDate(event.start, 'yyyy-MM-dd HH:mm:ss');
      event.end = customFormatDate(event.end, 'yyyy-MM-dd HH:mm:ss');
      this.form.patchValue(event);
    }
    this.form.get('isRequest').valueChanges.subscribe((isRequest) => {
      if (isRequest) {
        setTimeout(() => {
          this.form.get('requestType').patchValue('hospital');
          this.form.get('isGoogleEvent').patchValue(0);
        }, 0);

        this.form.get('showDateWithHours').patchValue(1);
      } else {
        if (this.form.get('isGoogleEvent').value === 1) {
          return;
        }
        setTimeout(() => {
          this.changeDateTimeByRequestType(true);
        }, 0);
        this.form.get('requestType').patchValue('own');
      }
    });
    this.form.get('requestType').valueChanges.subscribe((requestType) => {
      if (requestType !== 'own') {
        this.form
          .get('color')
          .patchValue({
            primary: this.iconsListByRequestTypes[requestType].color,
          });
        if (requestType === 'hospital' || requestType === 'timeOff') {
          this.form.get('showDateWithHours').patchValue(1);
        } else {
          this.form.get('showDateWithHours').patchValue(0);
        }
        this.form.get('dateWithHours').patchValue(0);
      } else {
        this.form.get('color').patchValue({ primary: '#4680ff' });
      }
      this.form.get('title').patchValue(requestType);
    });
    this.form.get('dateWithHours').valueChanges.subscribe((dateWithHours) => {
      setTimeout(() => {
        this.changeDateTimeByRequestType(dateWithHours);
      }, 0);
    });
    this.setApprovingStatus();
    this.form.setValidators([this.validatorService.requireStartBeforeEnd()]);
    if (this.isRequest === 1) {
      this.form.get('isRequest').patchValue(1);
    }
    this.form.get('start').valueChanges.subscribe((start) => {
      this.setTimeOffset(start, this.form.value.end);
    });
    this.form.get('end').valueChanges.subscribe((end) => {
      this.setTimeOffset(this.form.value.start, end);
    });
    if (!this.googleCalendarId) {
      this.form.get('isGoogleEvent').disable();
    } else {
      this.form.get('googleCalendarId').patchValue(this.googleCalendarId);
      this.form.get('googleTimezone').patchValue(this.googleTimezone);
    }
    if (this.form.get('isGoogleEvent').value === 1) {
      this.form.get('isRequest').disable();
      this.form.get('isGoogleEvent').disable();
    }
  }

  loadTranslations(): void {
    this.translateService
      .get([
        'daysOffStaticList.hospital',
        'daysOffStaticList.vocation',
        'daysOffStaticList.timeOff',
        'daysOffStaticList.transfer',
        'daysOffStaticList.home',
      ])
      .subscribe((translation) => {
        const keys = Object.keys(translation);
        for (let i = 0; i < keys.length; i++) {
          const fullKey = keys[i];
          const shortKey = fullKey.split('.').pop();
          if (this.iconsListByRequestTypes[shortKey]) {
            this.iconsListByRequestTypes[shortKey].title = translation[fullKey];
          }
        }
      });
  }
  closeDialog(action: string, result: any) {
    this.matDialogRef.close({ result, action });
  }

  onSubmit() {
    if (this.form.valid) {
      if (this.form.value.isRequest === 0) {
        this.form.value.requestType = 'own';
      } else {
        const newTypeValue =
          this.daysOffList[this.form.value.requestType] -
          this.form.value.timeOffset;
        if (newTypeValue >= 0) {
          this.daysOffList[this.form.value.requestType] = newTypeValue;
        }
      }

      this.checkDateTime();
      this.closeDialog('save', this.form.value);
    }
  }

  onDelete() {
    if (this.incomingEvent) {
      this.closeDialog('delete', this.incomingEvent);
    }
  }

  createForm() {
    this.form = this.formBuilder.group({
      id: null,
      title: '',
      start: this.selectedDate,
      end: this.selectedDate,
      isRequest: 0,
      approved: 0,
      requestType: 'own',
      comment: '',
      color: this.formBuilder.group({ primary: '#4680ff' }),
      draggable: true,
      resizable: {
        beforeStart: true,
        afterEnd: true,
      },
      createdAt: new Date(),
      dateWithHours: 0,
      showDateWithHours: 0,
      timeOffset: [1, Validators.min(0)],
      isGoogleEvent: 0,
      googleCalendarId: '',
      googleId: null,
      googleMeetLink: '',
      googleTimezone: this.googleTimezone,
      createMeetingSpace: 0,
      attendees: [[]],
    });
  }

  setApprovingStatus() {
    if (this.form.value.isRequest && this.form.value.approved === 1) {
      this.approvingStatus = 'approved';
    } else if (this.form.value.isRequest && this.form.value.approved === 0) {
      this.approvingStatus = 'waiting';
    } else if (this.form.value.isRequest && this.form.value.approved === -1) {
      this.approvingStatus = 'disapproved';
    }
    if (this.approvingStatus) {
      this.form.get('start').disable();
      this.form.get('end').disable();
    }
  }

  changeDateTimeByRequestType(dateWithHours = false) {
    let formattedDate;
    if (dateWithHours) {
      formattedDate = customFormatDate(
        this.selectedDate,
        'yyyy-MM-dd HH:mm:ss',
      );
      this.form.get('start').patchValue(formattedDate);
      this.form.get('end').patchValue(formattedDate);
    } else {
      formattedDate = customFormatDate(this.selectedDate, 'yyyy-MM-dd');
      this.form.get('start').patchValue(formattedDate);
      this.form.get('end').patchValue(formattedDate);
    }
  }

  checkDateTime() {
    if (this.form.value.isRequest && !this.form.value.dateWithHours) {
      // form.value.start/end are already the exact calendar day the user
      // picked (a bare 'yyyy-MM-dd' string, from the native date input or
      // from changeDateTimeByRequestType()). Routing that through
      // `new Date(...)` here would re-parse a bare date-only string as UTC
      // midnight (per the ES spec) and then reformat it with local-time
      // getters (startOfDay/endOfDay/customFormatDate) - for any timezone
      // behind UTC that silently shifts the request onto the wrong
      // calendar day. Slicing the string directly instead never
      // constructs a Date from an ambiguous bare date string, so the
      // result can't drift with the browser's timezone.
      const startDay = String(this.form.value.start).slice(0, 10);
      const endDay = String(this.form.value.end).slice(0, 10);
      this.form.get('start').patchValue(`${startDay} 00:00:00`);
      this.form.get('end').patchValue(`${endDay} 23:59:00`);
    }
  }

  setTimeOffset(start: any, end: any) {
    if (this.form.value.isRequest) {
      start = new Date(start).getTime();
      end = new Date(end).getTime();
      const diff = end - start;
      const hour = 60 * 60 * 1000;
      let timeOffset = 1;
      if (diff === 0) {
        timeOffset = 1;
      } else if (diff <= 2 * hour) {
        timeOffset = 0.25;
      } else if (diff <= 4 * hour) {
        timeOffset = 0.5;
      } else if (diff <= 6 * hour) {
        timeOffset = 0.75;
      } else if (diff >= 24 * hour) {
        timeOffset = Math.floor(diff / (24 * hour));
      }
      if (this.daysOffList[this.form.value.requestType] - timeOffset < 0) {
        timeOffset = -1;
      }
      this.form.get('timeOffset').patchValue(timeOffset);
    }
  }
  getAllPossibleAttendees(usersList) {
    return usersList.map((user) => {
      return { value: user.email, group: user.firstName + ' ' + user.lastName };
    });
  }
  getSelectedAttendees(event) {
    this.selectedAttendees = event.data;
    const currentAttendees = this.selectedAttendees.map((item) => {
      return { userEmail: item.value };
    });
    this.form.get('attendees').patchValue(currentAttendees);
  }
  setSelectedAttendees(attendees) {
    if (!attendees) {
      return [];
    }
    return attendees.map((attendee) => {
      const userEmail = attendee.userEmail;
      const user = this.userListByEmail[userEmail];
      const userName = user ? user.firstName + ' ' + user.lastName : userEmail;
      return { value: userEmail, group: userName };
    });
  }
}
