import { Component, OnInit } from '@angular/core';
import {DataService} from "../../services/data.service";
import {PendingActionsRendererComponent} from "../data-grid/pending-actions-renderer.component";
import {PendingDateRendererComponent} from "../data-grid/pending-date-renderer.component";
import {tap} from "rxjs";
import { LanguageService } from '../../language/language.service';

@Component({
    selector: 'app-pending-aggrid',
    templateUrl: './pending-aggrid.component.html',
    styleUrls: ['./pending-aggrid.component.scss'],
    standalone: false
})
export class PendingAggridComponent implements OnInit {

  columnDefs;
  defaultColDef;
  rowSelection;
  incomingRows: any;
  gridApi;
  gridColumnApi;
  getSelectedRows;
  rowData: any = [];
  frameworkComponents = {
    pendingActionsRendererComponent: PendingActionsRendererComponent,
    pendingDateRendererComponent: PendingDateRendererComponent,
  };
  constructor(public dataService: DataService, public translateService: LanguageService) {
    this.loadTranslations()
    this.defaultColDef = {
      minWidth: 200,
      editable: false,
      sortable: true,
      resizable: true,
      flex: 1,
      enableCellTextSelection: true,
      suppressSizeToFit: true,
      filter: true
    };
    this.rowSelection = 'single';
  }
  ngOnInit() {
    this.rowData = this.dataService.getObservableData('/events-by-user/pending');
    this.translateService.onLangChange.subscribe(() => this.loadTranslations());
  }
  onGridReady(params) {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
    this.gridApi.showLoadingOverlay();
    this.gridApi.sizeColumnsToFit();
  }
  loadTranslations() {
    this.translateService.get([
        'pending.data.firs_name',
        'pending.data.last_name',
        'pending.data.type',
        'pending.data.start',
        'pending.data.end',
        'pending.data.created',
        'pending.data.actions'
      ]).subscribe((transation)=>{
        this.columnDefs = [
        {headerName: transation['pending.data.firs_name'], field: 'firstName'},
        {headerName: transation['pending.data.last_name'], field: 'lastName', pinned: 'left'},
        // {headerName: 'Title', field: 'title', minWidth: 90},
        {headerName: transation['pending.data.type'], field: 'type', minWidth: 90},
        {headerName: transation['pending.data.start'], field: 'start', minWidth: 160, cellRenderer: 'pendingDateRendererComponent'},
        {headerName: transation['pending.data.end'], field: 'end', minWidth: 160, cellRenderer: 'pendingDateRendererComponent'},
        {headerName: transation['pending.data.created'], field: 'createdAt', minWidth: 90, cellRenderer: 'pendingDateRendererComponent'},
        {headerName: transation['pending.data.actions'], field: 'actions', minWidth: 120, cellRenderer: 'pendingActionsRendererComponent'},
      ];
    })
  }
}
