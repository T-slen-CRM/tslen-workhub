import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import * as moment from 'moment';

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
      const today = {
        year: parseInt(moment().format('YYYY')),
        month: parseInt(moment().format('M')),
        day: parseInt(moment().format('D')),
      }
      if (type.value === 'today') {
        range['start'] = {
          year: parseInt(moment().format('YYYY')),
          month: parseInt(moment().format('M')) - 1,
          day: parseInt(moment().format('D')),
        }
        const inputStartDate = Object.assign({}, range['start']);
        inputStartDate.month = inputStartDate.month + 1;
        this.dateStart = inputStartDate;
        this.dateEnd = today;
      } else if (type.value === 'yesterday') {
        range['start'] = {
          year: parseInt(moment().subtract(1, "day").format('YYYY')),
          month: parseInt(moment().subtract(1, "day").format('M')) - 1,
          day: parseInt(moment().subtract(1, "day").format('D')),
        }
        const inputStartDate = Object.assign({}, range['start']);
        inputStartDate.month = inputStartDate.month + 1;
        this.dateStart = inputStartDate;
        const inputEndDate = Object.assign({}, today);
        inputEndDate.day = inputEndDate.day - 1;
        this.dateEnd = inputEndDate;
      } else if (type.value === 'week') {
        range['start'] = {
          year: parseInt(moment().subtract(6, 'days').format('YYYY')),
          month: parseInt(moment().subtract(6, 'days').format('M')) - 1,
          day: parseInt(moment().subtract(6, 'days').format('D')),
        }
        const inputStartDate = Object.assign({}, range['start']);
        inputStartDate.month = inputStartDate.month + 1;
        this.dateStart = inputStartDate;
        this.dateEnd = today;
      } else if (type.value === 'month') {
        range['start'] = {
          year: parseInt(moment().format('YYYY')),
          month: parseInt(moment().format('M')) - 1,
          day: 1,
        }
        const inputStartDate = Object.assign({}, range['start']);
        inputStartDate.month = inputStartDate.month + 1;
        this.dateStart = inputStartDate;
        this.dateEnd = today;
      } else if (type.value === 'priviesMonth')  {
        range['start'] = {
          year: parseInt(moment().subtract(1, "M").format('YYYY')),
          month: parseInt(moment().subtract(1, "M").format('M')),
          day: 1,
        };
        const inputStartDate = Object.assign({}, range['start']);
        inputStartDate.month = inputStartDate.month;
        this.dateStart = inputStartDate;
        range['end'] = {
          year: parseInt(moment().subtract(1, "M").format('YYYY')),
          month: parseInt(moment().subtract(1, "M").format('M')),
          day: parseInt(moment(moment().subtract(1, "M")).endOf('M').format('D')),
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
