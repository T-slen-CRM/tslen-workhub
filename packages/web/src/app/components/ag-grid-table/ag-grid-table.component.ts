import {
  Component,
  effect,
  input,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';

@Component({
  selector: 'app-ag-grid-table',
  templateUrl: './ag-grid-table.component.html',
  styleUrls: ['./ag-grid-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class AgGridTableComponent {
  @ViewChild('agGrid') agGrid: AgGridAngular;
  columnDefs = input<any>([]);
  components = input<any>();
  rowData = input<any>();
  context = input<any>();
  sizeColumnsToFit = input<boolean>(false);
  headerHeight = input<number>(81);
  rowHeight = input<number>(38);
  tableId = input<string>();
  public defaultColDef: any;

  constructor() {
    this.defaultColDef = {
      resizable: true,
      width: 75,
    };
    effect(() => {
      if (this.sizeColumnsToFit() && this.agGrid) {
        setTimeout(() => {
          this.agGrid.api.sizeColumnsToFit();
        }, 200);
      }
    });
  }
}
