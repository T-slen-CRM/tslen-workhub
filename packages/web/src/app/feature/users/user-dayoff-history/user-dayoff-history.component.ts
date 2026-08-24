import {
  Component,
  inject,
  input,
  InputSignal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ComponentsModule } from '../../../components/components.module';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe } from '@angular/common';
import { LibsService } from '../../../services/libs.service';
import { IEvent } from '../../../interfaces/events';
import { ColDef } from 'ag-grid-community';
import { LanguageService } from 'src/app/language/language.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-user-dayoff-history',
  imports: [ComponentsModule, MatTooltipModule, DatePipe, TranslateModule],
  templateUrl: './user-dayoff-history.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './user-dayoff-history.component.scss',
})
export class UserDayoffHistoryComponent {
  constructor(public translateService: LanguageService) {}
  public eventsByUserRequest: InputSignal<IEvent[]> = input.required();
  private staticDaysOffObject = inject(LibsService).daysOffList;
  public columnDefs: ColDef[] = [];
  statusFormatter(params: { value: number }) {
    let icon = '';
    let color = '';
    let tooltip = '';
    switch (params.value) {
      case 1:
        icon = 'fa-solid fa-check';
        color = 'green';
        tooltip = 'Approved';
        break;
      case -1:
        icon = 'fa-solid fa-times';
        color = 'red';
        tooltip = 'Rejected';
        break;
      default:
        icon = 'fa-solid fa-question';
        color = 'yellow';
        tooltip = 'Pending';
        break;
    }
    return `
                <div class="custom-tooltip">
                <i style="color: ${color}" class="${icon}"></i>
                <span class="tooltiptext">${tooltip}</span>
                </div>
                `;
  }
  dateFormatter(params: { value: string }) {
    const datePipe = new DatePipe('en-US');
    return datePipe.transform(params.value, 'yyyy-MM-dd');
  }

  ngOnInit(): void {
    this.loadTranslations();
    this.translateService.onLangChange.subscribe(() => this.loadTranslations());
  }
  loadTranslations(): void {
    this.translateService
      .get([
        'people.days_off.data.title',
        'people.days_off.data.status',
        'people.days_off.data.start',
        'people.days_off.data.end',
        'people.days_off.data.comment',
      ])
      .subscribe((transation) => {
        this.columnDefs = [
          {
            headerName: transation['people.days_off.data.title'],
            field: 'title',
            sortable: true,
            filter: true,
            resizable: true,
            width: 282,
            valueFormatter: (param) =>
              this.staticDaysOffObject[param.value]
                ? this.staticDaysOffObject[param.value].title
                : param.value,
          },
          {
            headerName: transation['people.days_off.data.status'],
            field: 'approved',
            sortable: true,
            filter: true,
            resizable: true,
            width: 282,
            cellRenderer: (params) => this.statusFormatter(params),
          },
          {
            headerName: transation['people.days_off.data.start'],
            field: 'start',
            sortable: true,
            filter: true,
            resizable: true,
            width: 282,
            valueFormatter: (param) => this.dateFormatter(param),
          },
          {
            headerName: transation['people.days_off.data.end'],
            field: 'end',
            sortable: true,
            filter: true,
            resizable: true,
            width: 282,
            valueFormatter: (param) => this.dateFormatter(param),
          },
          {
            headerName: transation['people.days_off.data.comment'],
            field: 'comment',
            sortable: true,
            filter: true,
            resizable: true,
            width: 282,
          },
        ];
      });
  }
}
