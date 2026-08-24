import {
  Component,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  customFormatDate,
  dayByWeek,
  daysInMonth,
  getDaysArray,
} from '../../../helpers/utils';
import { DaysHeaderComponent } from '../../../tslen-components/ag-grid/days-header/days-header.component';
import { map, Observable, Subject, tap } from 'rxjs';
import { DataService } from '../../../services/data.service';
import {
  AuthData,
  AuthenticationService,
} from '../../../services/auth.service';
import { endOfDay, endOfMonth, format } from 'date-fns';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { DaysOffCellRendererComponent } from '../../../tslen-components/ag-grid/days-off-cell-renderer/days-off-cell-renderer.component';
import { NameAvatarCellRendererComponent } from '../../../tslen-components/ag-grid/name-avatar-cell-renderer/name-avatar-cell-renderer.component';
import { FormControl } from '@angular/forms';
import {
  IDaysOffStaticList,
  IFullEventList,
  LibsService,
} from '../../../services/libs.service';
import { LanguageService } from 'src/app/language/language.service';

@Component({
  selector: 'app-common-schedule',
  templateUrl: './common-schedule.component.html',
  styleUrls: ['./common-schedule.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class CommonScheduleComponent implements OnInit {
  public columnDefs: any;
  public defaultColDef: any;
  public rowData: any;
  public components: any;
  public authData: AuthData;
  public month: number;
  public year: number;
  public view: CalendarView = CalendarView.Month;
  public viewDate: Date;
  public events: CalendarEvent[] = [];
  public events$: Observable<CalendarEvent[]>;
  public eventsByDay: { [key: string]: CalendarEvent[] } = {};
  public clickedDate: Date;

  activeDayIsOpen = false;
  refresh = new Subject<void>();
  public isOpenCalendarDayWindow = false;
  public employeeViewControl = new FormControl(0);
  public totalStaticEventIconList: IFullEventList;

  constructor(
    private dataService: DataService,
    private authService: AuthenticationService,
    public translateService: LanguageService,
  ) {
    this.totalStaticEventIconList = this.setTotalStaticIconList();

    const date = new Date();
    this.setYearMonth(date);
    this.viewDate = date;
    // this.columnDefs = [
    //   {headerName: 'Name', field: 'name', minWidth: 200, pinned: 'left', cellRenderer: 'nameAvatarCellRendererComponent' },
    // ];
    this.defaultColDef = {
      editable: false,
      sortable: true,
      resizable: true,
      // maxWidth: 25,
      // suppressSizeToFit: true
    };
    this.components = {
      daysHeaderComponent: DaysHeaderComponent,
      daysOffCellRendererComponent: DaysOffCellRendererComponent,
      nameAvatarCellRendererComponent: NameAvatarCellRendererComponent,
    };
    this.setColumnDef(this.year, this.month);
    this.authData = this.authService.authData;
  }

  private lastLang: string;

  ngOnInit(): void {
    this.getRowData();
    this.getEventsData();
    this.lastLang = this.translateService.currentLang;
    this.translateService.onLangChange.subscribe((event) => {
      if (event.lang !== this.lastLang) {
        this.lastLang = event.lang;
        this.setColumnDef(this.year, this.month);
      }
    });
  }

  setColumnDef(year: number, month: number) {
    this.translateService
      .get('common_schedule.name_column')
      .subscribe((nameColumnHeader) => {
        this.columnDefs = [
          {
            headerName: nameColumnHeader,
            field: 'name',
            minWidth: 200,
            pinned: 'left',
            cellRenderer: 'nameAvatarCellRendererComponent',
            headerClass: 'common-name-header',
          },
        ];
        const daysInMonthV = daysInMonth(month, year);
        for (let i = 1; i <= daysInMonthV; i++) {
          const date = `${year}-${month}-${i} 05:00:00`;
          const weekDay = dayByWeek(new Date(date));
          const headerName = i + '|' + weekDay + '|' + date;
          this.columnDefs.push({
            headerName,
            field: '' + i,
            cellRenderer: 'daysOffCellRendererComponent',
            headerComponent: 'daysHeaderComponent',
            width: 10,
            cellClassRules: {
              // apply green to 2008
              'weekends-columns': (params) => {
                // tslint:disable-next-line:no-shadowed-variable
                const weekDay = params.colDef.headerName.split('|')[1];
                return weekDay === '6' || weekDay === '0';
              },
            },
          });
        }
      });
  }

  addExtensionDays(array) {
    return array.reduce((newArr, event) => {
      if (event.dateDiff > 1) {
        const extensionDateArray = getDaysArray(event.start, event.end);
        extensionDateArray.forEach((day) => {
          const oneDate = new Date(day);
          if (oneDate.getMonth() + 1 === this.month) {
            const newEvent = Object.assign({}, event);
            newEvent.start = day;
            newEvent.end = endOfDay(oneDate);
            newEvent.monthDay = oneDate.getDate();
            newArr.push(newEvent);
          }
        });
      } else {
        event.monthDay = new Date(event.start).getDate();
        newArr.push(event);
      }
      return newArr;
    }, []);
  }

  aggregateEventsByUser(array) {
    return array.reduce((obj, item) => {
      if (obj[item.id]) {
        if (item.requestType !== '0') {
          obj[item.id][item.monthDay] =
            item.requestType + '|' + item.timeDiff + '|' + item.approved;
        }
      } else {
        obj[item.id] = {
          name: item.avatar + '|' + item.firstName + ' ' + item.lastName,
        };
        if (item.requestType !== '0') {
          obj[item.id][item.monthDay] =
            item.requestType + '|' + item.timeDiff + '|' + item.approved;
        }
      }
      return obj;
    }, {});
  }

  changeMonth(date: Date) {
    this.setYearMonth(date);
    this.setColumnDef(this.year, this.month);
    this.getRowData();
    this.getEventsData();
  }

  getRowData() {
    const { startDate, endDate } = this.getDatesForRequest();
    this.rowData = this.dataService
      .getObservableData(
        '/events-by-user/events-by-month?startDate=' +
          startDate +
          '&endDate=' +
          endDate,
      )
      .pipe(
        map((response) => {
          const newEventsArray = this.addExtensionDays(response);
          const eventsByUser = this.aggregateEventsByUser(newEventsArray);
          return Object.keys(eventsByUser).map((item) => eventsByUser[item]);
        }),
      );
  }
  getEventsData() {
    const { startDate, endDate } = this.getDatesForRequest();
    this.events$ = this.dataService
      .getObservableData(
        `/users/get-with-relations-by-date-range?startDate=${startDate}&endDate=${endDate}`,
      )
      .pipe(
        map((userData) => {
          let events = [];
          userData.forEach((user) => {
            const absentEvents = this.generateAbsentCalendarEvents(user);
            events = events.concat(absentEvents);
            // probation events
            const probationEvent = this.generateProbationCalendarEvents(user);
            if (probationEvent) {
              events.push(probationEvent);
            }
            // new employees events
            const firstDayEvent = this.generateSingleDayCalendarEvents(
              user,
              'firstDayInCompany',
              'newEmployee',
              'New employee',
            );
            if (firstDayEvent) {
              events.push(firstDayEvent);
            }
            // birthday events
            const birthdayEvent = this.generateAnniversaryCalendarEvents(
              user,
              'birthDay',
              'birthDay',
              'Birthdays',
            );
            if (birthdayEvent) {
              events.push(birthdayEvent);
            }
            // anniversary events
            const anniversary = this.generateAnniversaryCalendarEvents(
              user,
              'firstDayInCompany',
              'anniversary',
              'Anniversary',
            );
            if (anniversary) {
              events.push(anniversary);
            }
          });
          return events;
        }),
      );
  }

  setYearMonth(date: Date) {
    this.month = date.getMonth() + 1;
    this.year = date.getFullYear();
  }

  dayClicked({ date, events }: { date: Date; events: CalendarEvent[] }): void {
    this.isOpenCalendarDayWindow = true;
    // separate by event category
    // example : {Absent: [], Probation: []}
    const eventsByCategory = events.reduce((obj, event: any) => {
      if (obj[event.category]) {
        obj[event.category].push(event);
      } else {
        obj[event.category] = [event];
      }
      return obj;
    }, {});
    this.eventsByDay = eventsByCategory;
    this.clickedDate = date;
  }

  handleEvent(action: string, event: CalendarEvent): void {}

  eventTimesChanged(): void {}

  generateAbsentCalendarEvents(user: any) {
    const events = user.eventsByUsers;
    return events.reduce((newArr, currentItem) => {
      const oneEvent = {
        id: currentItem.id,
        start: new Date(currentItem.start),
        end: new Date(currentItem.end),
        title: currentItem.title,
        titleAlias: currentItem.title,
        color: {
          primary: currentItem.primaryColor,
          secondary:
            currentItem.isRequest && currentItem.approved !== 1
              ? '#d4dadc'
              : currentItem.primaryColor,
        },
        cssClass: 'calendar-event',
        // actions: this.actions,
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
        userFirstName: user.firstName,
        userLastName: user.lastName,
        userAvatar: user.avatar,
        category: 'Absent',
      };
      newArr.push(oneEvent);
      return newArr;
    }, []);
  }

  generateProbationCalendarEvents(user: any) {
    const userProbationObject = user.userProbation;
    if (!userProbationObject) {
      return null;
    }
    return {
      id: userProbationObject.id,
      start: new Date(userProbationObject.end),
      // end: new Date(userProbationObject.end),
      title: 'probation',
      titleAlias: 'Probation end',
      color: {
        primary: '#ff3f80',
        secondary: '#ff3f80',
      },
      cssClass: 'calendar-event',
      resizable: {
        beforeStart: true,
        afterEnd: true,
      },
      draggable: false,
      userFirstName: user.firstName,
      userLastName: user.lastName,
      userAvatar: user.avatar,
      category: 'Probation',
    };
  }
  generateSingleDayCalendarEvents(
    user: any,
    key: string,
    titleAlias: string,
    category: string,
  ) {
    const keyDate = user[key];
    if (!keyDate) {
      return null;
    }
    return {
      id: user.id + Date.now() + key,
      start: new Date(keyDate),
      title: titleAlias,
      titleAlias: titleAlias,
      color: {
        primary: '#07FFDAFF',
        secondary: '#07FFDAFF',
      },
      cssClass: 'calendar-event',
      resizable: {
        beforeStart: true,
        afterEnd: true,
      },
      draggable: false,
      userFirstName: user.firstName,
      userLastName: user.lastName,
      userAvatar: user.avatar,
      category: category,
    };
  }
  generateAnniversaryCalendarEvents(
    user: any,
    key: string,
    titleAlias: string,
    category: string,
  ) {
    const _key = user[key];
    if (!_key) {
      return null;
    }
    const userDate = new Date(_key);
    const numberOfDaysInMonth = daysInMonth(this.month, this.year);

    for (let day = 1; day <= numberOfDaysInMonth; day++) {
      const targetDate = new Date();
      targetDate.setMonth(this.month - 1); // December is 0-indexed, so 11 represents December
      targetDate.setDate(day);
      // Check if the user has a birthday or anniversary on the current day
      if (
        userDate.getMonth() === targetDate.getMonth() &&
        userDate.getDate() === targetDate.getDate()
      ) {
        // avoid showing anniversary in a first day
        if (
          key === 'firstDayInCompany' &&
          userDate.getDay() === targetDate.getDay()
        ) {
          continue;
        }
        return {
          id: user.id + Date.now() + key,
          start: targetDate,
          title: titleAlias,
          titleAlias: titleAlias,
          color: {
            primary: '#07FFDAFF',
            secondary: '#07FFDAFF',
          },
          cssClass: 'calendar-event',
          resizable: {
            beforeStart: true,
            afterEnd: true,
          },
          draggable: false,
          userFirstName: user.firstName,
          userLastName: user.lastName,
          userAvatar: user.avatar,
          category: category,
        };
      }
    }
  }
  getDatesForRequest() {
    const month = this.month < 10 ? '0' + this.month : this.month;
    const startDate = `${this.year}-${month}-01`;
    const endDate = endOfMonth(new Date(startDate));
    const formattedEndDate = customFormatDate(endDate, 'yyyy-MM-dd');
    return { startDate, endDate: formattedEndDate };
  }
  setTotalStaticIconList() {
    const daysOffList: IDaysOffStaticList = Object.assign(
      {},
      inject(LibsService).daysOffList,
    );
    const newEmployee = {
      icon: 'person_add',
      title: 'New employee',
      color: '#07FFDAFF',
    };
    const probation = { icon: 'school', title: 'Probation', color: '#FFC107' };
    const birthDay = { icon: 'cake', title: 'Birthday', color: '#FF4081' };
    const anniversary = {
      icon: 'star',
      title: 'Anniversary',
      color: '#FF4081',
    };
    return Object.assign(daysOffList, {
      probation,
      newEmployee,
      birthDay,
      anniversary,
    });
  }
}
