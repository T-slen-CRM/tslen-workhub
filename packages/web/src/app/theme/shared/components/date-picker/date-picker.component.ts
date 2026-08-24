import {Component, EventEmitter, OnInit, Output} from '@angular/core';

interface IDateParts {
  year: number;
  month: number;
  day: number;
}

function dateParts(date: Date): IDateParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// Anchored to the 1st of the month before subtracting, so the day-of-month
// never overflows into an adjacent month (e.g. subtracting a month from
// March 31 must land on February, not roll over back into March).
function monthsAgoAnchor(months: number): Date {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() - months, 1);
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

@Component({
    selector: 'app-datepicker',
    templateUrl: './date-picker.component.html',
    styleUrls: ['./date-picker.component.scss'],
    standalone: false
})

export class DatePickerComponent implements OnInit {

  @Output() dateRangeChanged: EventEmitter<object>;
  dateStart: any;
  dateEnd: any;
  invalidRange: boolean;
  ranges: any[];

  constructor() {
    this.dateRangeChanged = new EventEmitter<object>();
    this.ranges = [
      {id: 0, tittle: 'Today', value: 'today', focus: false},
      {id: 1, tittle: 'Yesterday', value: 'yesterday', focus: false},
      {id: 2, tittle: 'Last 7 days', value: 'week', focus: false},
      {id: 3, tittle: 'This month', value: 'month', focus: false},
      {id: 4, tittle: 'Last month', value: 'priviesMonth', focus: false}
    ];
  }

  ngOnInit() {
    this.onClick(this.ranges[2]);
  }

  onClick(type?: any) {
    if (type) {
      this.resetFocus();
      type.focus = !type.focus;
    }
    const range = {};
    this.invalidRange = false;
    if (type) {
      const today = dateParts(new Date());
      if (type.value === 'today') {
        range['start'] = {
          year: today.year,
          month: today.month - 1,
          day: today.day,
        }
        const inputStartDate = Object.assign({}, range['start']);
        inputStartDate.month = inputStartDate.month + 1;
        this.dateStart = inputStartDate;
        this.dateEnd = today;
      } else if (type.value === 'yesterday') {
        const yesterday = dateParts(daysAgo(1));
        range['start'] = {
          year: yesterday.year,
          month: yesterday.month - 1,
          day: yesterday.day,
        }
        const inputStartDate = Object.assign({}, range['start']);
        inputStartDate.month = inputStartDate.month + 1;
        this.dateStart = inputStartDate;
        const inputEndDate = Object.assign({}, today);
        inputEndDate.day = inputEndDate.day - 1;
        this.dateEnd = inputEndDate;
      } else if (type.value === 'week') {
        const weekAgo = dateParts(daysAgo(6));
        range['start'] = {
          year: weekAgo.year,
          month: weekAgo.month - 1,
          day: weekAgo.day,
        }
        const inputStartDate = Object.assign({}, range['start']);
        inputStartDate.month = inputStartDate.month + 1;
        this.dateStart = inputStartDate;
        this.dateEnd = today;
      } else if (type.value === 'month') {
        range['start'] = {
          year: today.year,
          month: today.month - 1,
          day: 1,
        }
        const inputStartDate = Object.assign({}, range['start']);
        inputStartDate.month = inputStartDate.month + 1;
        this.dateStart = inputStartDate;
        this.dateEnd = today;
      } else if (type.value === 'priviesMonth')  {
        const prevAnchor = monthsAgoAnchor(1);
        const prevYear = prevAnchor.getFullYear();
        const prevMonth = prevAnchor.getMonth() + 1;
        range['start'] = {
          year: prevYear,
          month: prevMonth,
          day: 1,
        };
        const inputStartDate = Object.assign({}, range['start']);
        inputStartDate.month = inputStartDate.month;
        this.dateStart = inputStartDate;
        range['end'] = {
          year: prevYear,
          month: prevMonth,
          day: lastDayOfMonth(prevYear, prevMonth),
        }
        const inputEndDate = Object.assign({}, range['end']);
        inputEndDate.month = inputEndDate.month;
        this.dateEnd = inputEndDate;
      }
    } else {
      this.resetFocus()
      range['start'] = this.dateStart ? Object.assign({},  this.dateStart) : this.dateStart;
      range['end'] = this.dateEnd ? Object.assign({},  this.dateEnd) : this.dateEnd;
    }
    const rangeKeys: string[] = Object.keys(range);
    if (rangeKeys.includes('start') && rangeKeys.includes('end')) {
      if (!range['start'] || !range['end']) {
        this.invalidRange = true;
      } else {
        range['start'].month = range['start'].month - 1;
        range['end'].month = range['end'].month - 1;
        this.dateRangeChanged.emit(range);
      }
    } else {
      this.dateRangeChanged.emit(range);
    }
  }

  resetFocus(): void {
    this.ranges.forEach(range => { if (range.focus) { range.focus = !range.focus; }})
  }

}
