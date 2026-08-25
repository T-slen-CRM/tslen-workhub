import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewChild,
} from '@angular/core';
import {
  MatTable,
  MatTableModule,
} from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { blub, fadeOut } from '../../../animations/animations';

@Component({
  selector: 'app-mat-table-dynamic',
  templateUrl: './mat-table-dynamic.component.html',
  styleUrls: ['./mat-table-dynamic.component.scss'],
  animations: [blub, fadeOut],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    MatTableModule,
    FormsModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
})
export class MatTableDynamicComponent implements AfterViewInit {
  @ViewChild(MatTable) table: MatTable<any>;
  public displayedColumns: any[] = [];
  public originObjectDisplayedColumns = [];
  public dataSource: any;

  @Input() public set setDisplayedColumns(data: any) {
    this.originObjectDisplayedColumns = data;
    this.displayedColumns = data.map((item) => item.field);
  }
  @Input() public set setDataSource(data: any) {
    if (data) {
      this.dataSource = data;
    }
  }
  @Input() public set addItem(data: any) {
    if (data) {
      this.onAdd(data);
    }
  }
  @Input() tableName: string[];
  @Input() hideHeaders: boolean;
  @Input() noData: string;
  @Input() public eventsTypeList: object;

  // myInjector: Injector;
  constructor() {}

  ngAfterViewInit() {}
  onAdd(request: any) {
    this.dataSource.push(request);
    this.table.renderRows();
  }
}
