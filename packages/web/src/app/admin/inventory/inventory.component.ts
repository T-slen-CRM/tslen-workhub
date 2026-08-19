import {Component, inject, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {ComponentsModule} from '../../components/components.module';
import {MatButtonModule} from '@angular/material/button';
import {IInventory} from './interfaces/inventory';
import {InventoryService} from './services/inventory.service';
import {RouterLink} from '@angular/router';
import {InventoryRenderComponent} from '../../tslen-components/ag-grid/inventory-render/inventory-render.component';
import {ColDef} from "ag-grid-community";
import {Observable, of} from "rxjs";
import {catchError, startWith} from "rxjs/operators";
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../language/language.service';


@Component({
    selector: 'app-inventory',
    imports: [CommonModule, ComponentsModule, MatButtonModule, RouterLink, TranslateModule],
    templateUrl: './inventory.component.html',
    styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private languageService = inject(LanguageService);
  private lastLang: string;
  public rowData: Observable <IInventory[]> = this.inventoryService.getInventory().pipe(startWith([] as IInventory[]),catchError(() => of([])));
  public columnDefs: ColDef[] = [
    {field: 'id', headerName: 'ID'},
    {field: 'code', headerName: 'Code', cellRenderer: 'inventoryRenderComponent'},
    {field: 'name', headerName: 'Name'},
    {field: 'serialNumber', headerName: 'Serial'},
    {field: 'category', headerName: 'Category'},
    {field: 'user', headerName: 'User', valueFormatter: (params) => {
        if(!params.value) {
          return '';}
        return `${params.value.firstName} ${params.value.lastName}`;
      } }
  ];
  public frameworkComponents = {
    inventoryRenderComponent: InventoryRenderComponent
  };

  ngOnInit(): void {
    this.lastLang = this.languageService.currentLang;
    this.applyColumnTranslations();
    this.languageService.onLangChange.subscribe(event => {
      if (event.lang !== this.lastLang) {
        this.lastLang = event.lang;
        this.applyColumnTranslations();
      }
    });
  }

  private applyColumnTranslations(): void {
    this.languageService.get([
      'inventory.list.column_id',
      'inventory.list.column_code',
      'inventory.list.column_name',
      'inventory.list.column_serial',
      'inventory.list.column_category',
      'inventory.list.column_user',
    ]).subscribe(translations => {
      const headerNameByField = {
        id: translations['inventory.list.column_id'],
        code: translations['inventory.list.column_code'],
        name: translations['inventory.list.column_name'],
        serialNumber: translations['inventory.list.column_serial'],
        category: translations['inventory.list.column_category'],
        user: translations['inventory.list.column_user'],
      };
      this.columnDefs = this.columnDefs.map(column => ({
        ...column,
        headerName: headerNameByField[column.field] ?? column.headerName,
      }));
    });
  }
}
