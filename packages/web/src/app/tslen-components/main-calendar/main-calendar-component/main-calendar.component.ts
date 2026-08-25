import {
  AfterViewInit,
  Component,
  Input,
  OnDestroy,
  TemplateRef,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { EMPTY, map, Subject, Subscription, switchMap } from 'rxjs';
import {
  CalendarEvent,
  CalendarEventAction,
  CalendarEventTimesChangedEvent,
  CalendarView,
} from 'angular-calendar';
import { MatDialog } from '@angular/material/dialog';
import { DataService } from '../../../services/data.service';
import { HttpResponse } from '@angular/common/http';
import { antiMergeObjectArray } from '../../../helpers/utils';
import { CreateOneEventDialogComponent } from '../../create-one-event-dialog/create-one-event-dialog.component';
import { DeleteConfirmModalComponent } from '../../../components/delete-confirm-modal/delete-confirm-modal.component';
import { ToastrService } from 'ngx-toastr';
import { UserGeneralData } from '../../../interfaces/userConfig';
import { IGoogleCalendar } from '../../../interfaces/google';
import { LanguageService } from 'src/app/language/language.service';

@Component({
  selector: 'mwl-demo-component',
  // changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'main-calendar.component.html',
  styleUrls: ['./main-calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class MainCalendarComponent implements OnDestroy, AfterViewInit {
  @ViewChild('modalContent', { static: true }) modalContent: TemplateRef<any>;
  private eventsByUser: any;
  private generaUserData: any;
  private googleCalendarData: IGoogleCalendar;
  public usersList: any;
  @Input() public set setEventsByUser(userData: UserGeneralData) {
    if (userData) {
      this.generaUserData = userData;
      this.eventsByUser = userData.eventsByUsers;
      this.googleCalendarData = userData.googleCalendars;
      this.events = this.generateCalendarEvents(userData.eventsByUsers);
    }
  }
  @Input() public set setUsersList(usersList: any) {
    if (usersList) {
      this.usersList = usersList;
    }
  }
  private subscription: Subscription;
  view: CalendarView = CalendarView.Week;

  CalendarView = CalendarView;

  viewDate: Date = new Date();

  actions: CalendarEventAction[] = [
  ];

  refresh = new Subject<void>();

  events: CalendarEvent[] = [];

  activeDayIsOpen = false;
  public calendarViews: any[] = [
    { title: 'personals_chedule.button.day', view: CalendarView.Day },
    { title: 'personals_chedule.button.week', view: CalendarView.Week },
    { title: 'personals_chedule.button.month', view: CalendarView.Month },
  ];

  constructor(
    public dialog: MatDialog,
    private dataService: DataService,
    private toastrService: ToastrService,
    public translateService: LanguageService,
  ) {
    this.subscription = new Subscription();
  }

  ngAfterViewInit(): void {
    this.scrollToCurrentTimeMarker();
  }

  dayClicked({ date, events: _events }: { date: Date; events: CalendarEvent[] }): void {
    this.openCreateOneEventDialog(0, date, [], this.googleCalendarData);
  }
  hourClicked(date): void {
    // this.openCreateEventDialog(date);
    this.openCreateOneEventDialog(0, date, [], this.googleCalendarData);
  }

  eventTimesChanged({
    event,
    newStart,
    newEnd,
  }: CalendarEventTimesChangedEvent): void {
    /// TODO: interface
    let updatedEvent;
    const incomingEvent: any = event;
    if (incomingEvent.approved === 1) {
      this.toastrService.warning(
        'You can not change time for approved events.',
      );
      return;
    } else if (incomingEvent.approved === -1) {
      incomingEvent.approved = 0;
      event = incomingEvent;
    }
    this.events = this.events.map((iEvent) => {
      if (iEvent === event) {
        updatedEvent = {
          ...event,
          start: newStart,
          end: newEnd,
        };
        return updatedEvent;
      }
      return iEvent;
    });
    //this.saveEvents(updatedEvent);
    this.updateEvents(updatedEvent);
    this.handleEvent('Dropped or resized', event);
  }

  handleEvent(action: string, event: CalendarEvent): void {
    if (action === 'Clicked') {
      this.openCreateOneEventDialog(0, null, event, this.googleCalendarData);
    } else if (action === 'Deleted') {
      this.confirmDeleteDialog(event);
    }
  }

  deleteEvent(eventToDelete: CalendarEvent) {
    const deleteEvent: Subscription = this.dataService
      .deleteData('/events-by-user/', +eventToDelete.id)
      .subscribe((_r) => {
        this.events = this.events.filter((event) => event !== eventToDelete);
      });
    this.subscription.add(deleteEvent);
  }

  setView(view: CalendarView) {
    this.view = view;
    if (view !== 'month') {
      setTimeout(() => {
        this.scrollToCurrentTimeMarker();
      }, 100);
    }
  }

  closeOpenMonthViewDay() {
    this.activeDayIsOpen = false;
  }
  generateCalendarEvents(events: any) {
    return events.reduce((newArr, currentItem) => {
      const oneEvent = {
        id: currentItem.id,
        start: new Date(currentItem.start),
        end: new Date(currentItem.end),
        title:
          currentItem.isRequest && !currentItem.approved
            ? currentItem.title + ' - waiting for approving'
            : currentItem.title,
        color: {
          primary: currentItem.primaryColor,
          secondary:
            currentItem.isRequest && currentItem.approved !== 1
              ? '#d4dadc'
              : currentItem.primaryColor,
        },
        cssClass: 'calendar-event',
        actions: this.actions,
        // allDay: true,
        resizable: {
          beforeStart: true,
          afterEnd: true,
        },
        draggable: false,
        isRequest: currentItem.isRequest,
        approved: currentItem.approved,
        type: currentItem.type,
        requestType: currentItem.requestType,
        comment: currentItem.comment,
        isGoogleEvent: currentItem.isGoogleEvent,
        googleId: currentItem.googleId,
        googleMeetLink: currentItem.googleMeetLink,
        attendees: currentItem.attendees,
      };
      newArr.push(oneEvent);
      return newArr;
    }, []);
  }
  openCreateOneEventDialog(
    isRequest = 0,
    date = new Date(),
    events: CalendarEvent | CalendarEvent[] = [],
    googleCalendarData: IGoogleCalendar,
  ): void {
    const dialogRef = this.dialog.open(CreateOneEventDialogComponent, {
      width: '400px',
      data: {
        events,
        date,
        daysOffList: this.generaUserData.daysOff,
        isRequest,
        googleCalendarData,
        usersList: this.usersList,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.result) {
        if (result.action === 'save') {
          if (result.result.id) {
            this.updateEvents(result.result);
          } else {
            this.saveEvents(result.result);
          }
        } else if (result.action === 'delete') {
          this.confirmDeleteDialog(result.result);
        }
      }
    });
  }
  confirmDeleteDialog(event: CalendarEvent): void {
    const dialogRef = this.dialog.open(DeleteConfirmModalComponent, {
      width: '400px',
      data: { text: 'Do you want to delete this event?' },
    });
    dialogRef
      .afterClosed()
      .pipe(
        switchMap((result) => {
          if (result) {
            return this.dataService.deleteData('/events-by-user/', +event.id);
          } else {
            return EMPTY;
          }
        }),
      )
      .subscribe((_r) => {
        this.events = this.events.filter((e: CalendarEvent) => e !== event);
      });
  }
  saveEvents(event: CalendarEvent) {
    const eventColors = this.convertEventColor(event.color);
    Object.assign(event, eventColors);
    const save: Subscription = this.dataService
      .postData('/events-by-user', event)
      .pipe(
        map((r: HttpResponse<any>) => {
          return this.mappingUpdatedEvent(r.body);
        }),
      )
      .subscribe((eventsArr: CalendarEvent[]) => {
        this.events = eventsArr;
        this.refresh.next();
      });
    this.subscription.add(save);
  }
  updateEvents(event: CalendarEvent) {
    const eventColors = this.convertEventColor(event.color);
    Object.assign(event, eventColors);
    const save: Subscription = this.dataService
      .updateData('/events-by-user/', +event.id, event)
      .pipe(
        map((r: HttpResponse<any>) => {
          return this.mappingUpdatedEvent(r.body);
        }),
      )
      .subscribe((eventsArr: CalendarEvent[]) => {
        this.events = eventsArr;
        this.refresh.next();
      });
    this.subscription.add(save);
  }
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
  mappingUpdatedEvent(body) {
    let updatedEvents: CalendarEvent[] = [];
    if (Array.isArray(body)) {
      updatedEvents = this.generateCalendarEvents(body);
    } else {
      updatedEvents = this.generateCalendarEvents([body]);
    }
    return antiMergeObjectArray(updatedEvents, this.events, 'id');
  }
  onChangedViewSelect(event) {
    this.setView(event);
  }
  scrollToCurrentTimeMarker() {
    document
      .getElementsByClassName('cal-current-time-marker')[0]
      .scrollIntoView();
  }
  convertEventColor(color: any) {
    return {
      primaryColor: color.primary || '',
      secondaryColor: color.secondary || '',
    };
  }
}
