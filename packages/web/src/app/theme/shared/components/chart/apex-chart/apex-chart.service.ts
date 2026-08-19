import { Injectable, Output, EventEmitter, Directive } from '@angular/core';

@Directive()
@Injectable()
export class ApexChartService {
  @Output() changeTimeRange: EventEmitter<boolean> = new EventEmitter();
  @Output() changeSeriesData: EventEmitter<boolean> = new EventEmitter();

  constructor() { }

  eventChangeTimeRange() {
    this.changeTimeRange.emit();
  }

  eventChangeSeriesData() {
    this.changeSeriesData.emit();
  }
}
