import {AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild} from '@angular/core';
import {AgGridAngular} from 'ag-grid-angular';

@Component({
    selector: 'app-ag-grid-table',
    templateUrl: './ag-grid-table.component.html',
    styleUrls: ['./ag-grid-table.component.scss'],
    standalone: false
})
export class AgGridTableComponent implements AfterViewInit {

  @ViewChild('agGrid') agGrid: AgGridAngular;
  public columnDefs: any;
  @Input() public set setColumnDefs(data: any){
    this.columnDefs = data;
  }
  @Input() public frameworkComponents: any;
  @Input() public set setFrameworkComponents(data: any){
    this.frameworkComponents = data;
  }
  @Input() public set setRowData(data: any){
    this._rowData = data;
  }
  @Input() public set setSizeColumnsToFit(data: any){
    if (this.agGrid){
      setTimeout(() => {
        this.agGrid.api.sizeColumnsToFit();
      }, 200);
    }
  }
  @Input() public set setHeaderHeight(data: any){
    this.headerHeight = data;
  }
  @Input() public set setRowHeight(data: any) {
    this.rowHeight = data;
  }
  @Input() tableId: string;
  public _rowData: any;
  public defaultColDef: any;
  public headerHeight: number = 81;
  public rowHeight: number = 38;

  constructor() {
    this.columnDefs = [];
    this.defaultColDef = {
      resizable: true,
      headerHeight: 81,
      pagination: true,
      width: 75,
    };
  }

  ngAfterViewInit(): void {
    this.agGrid.api.sizeColumnsToFit();
  }


}
