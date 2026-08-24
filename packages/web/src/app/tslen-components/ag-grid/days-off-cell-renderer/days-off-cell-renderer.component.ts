import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AgRendererComponent } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { LibsService } from '../../../services/libs.service';
import { LanguageService } from 'src/app/language/language.service';

@Component({
  selector: 'app-days-off-cell-renderer',
  template: `
    <ng-container>
      @if (style) {
      <div [style]="style" [matTooltip]="tooltip">
        <mat-icon>{{ icon }}</mat-icon>
      </div>
      }
    </ng-container>
  `,
  styleUrls: ['./days-off-cell-renderer.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class DaysOffCellRendererComponent implements AgRendererComponent {
  public params: any;
  public daysOffList: any;
  public requestType: string;
  public time: string;
  public style: object;
  public icon: string;
  public tooltip: string;
  constructor(
    public libsService: LibsService,
    public translateService: LanguageService,
  ) {
    this.daysOffList = this.libsService.daysOffList;
  }
  agInit(params: ICellRendererParams): void {
    this.params = params;
    if (this.params && this.params.value) {
      const paramsArr = this.params.value.split('|');
      this.requestType = paramsArr[0];
      this.time = paramsArr[1];
      const approved = +paramsArr[2];

      let backgroundColor: string;
      let textColor: string;
      let border: string;

      if (approved) {
        backgroundColor = this.daysOffList[this.requestType].color;
        textColor = '#fff';
        border = 'none';
      } else {
        backgroundColor = '#d4dadc';
        textColor = this.daysOffList[this.requestType].color;
        border = '1px solid ' + this.daysOffList[this.requestType].color;
        this.translateService.get('requestApprov').subscribe((res: string) => {
          this.tooltip = res;
        });
      }

      this.style = {
        background: backgroundColor,
        color: textColor,
        width: '43px',
        height: '35px',
        'border-radius': '2px',
        border: border,
        margin: '2px',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
      };
      this.icon = this.daysOffList[this.requestType].icon;
    }
  }

  refresh(params: ICellRendererParams): boolean {
    return false;
  }
}
