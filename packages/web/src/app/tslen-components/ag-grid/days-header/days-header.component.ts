import { Component, ChangeDetectionStrategy } from '@angular/core';
import { getWeekDays } from '../../../helpers/utils';

@Component({
  selector: 'app-custom-days-header',
  template: `
    <div class="header-common-schedule">
      <p [style]="today ? { color: '#ff3f80' } : {}">
        {{ this.monthDay | translate }}
      </p>
      <p
        [style]="
          today ? { 'text-decoration': 'underline', color: '#ff3f80' } : {}
        "
      >
        {{ this.weekDay | translate }}
      </p>
    </div>
  `,
  styles: [
    `
      .header-common-schedule {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class DaysHeaderComponent {
  public params: any;
  public displayName: string;
  public monthDay: string;
  public weekDay: string;
  public staticWeekDaysConverter: object;
  // public style: object;
  public today: boolean;
  constructor() {
    this.staticWeekDaysConverter = getWeekDays();
  }

  agInit(params): void {
    this.params = params;
    this.displayName = this.params.displayName.split('|');
    this.monthDay = this.displayName[0];
    this.weekDay = this.staticWeekDaysConverter[this.displayName[1]];
    this.today = this.compareTwoDates(new Date());
  }
  compareTwoDates(date1) {
    const d1 = new Date(
      `${date1.getFullYear()}-${date1.getMonth() + 1}-${date1.getDate()}`,
    );
    const d2 = new Date(this.displayName[2].split(' ')[0]);
    return d1.getTime() === d2.getTime();
  }
}
