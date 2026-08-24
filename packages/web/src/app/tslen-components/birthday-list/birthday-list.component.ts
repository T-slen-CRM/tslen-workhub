import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { ComponentsModule } from '../../components/components.module';
import { MatTableComponent } from '../mat-table/mat-table.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-birthday-list',
  imports: [CommonModule, ComponentsModule, MatTableComponent, TranslateModule],
  templateUrl: './birthday-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./birthday-list.component.scss'],
})
export class BirthdayListComponent implements OnInit {
  public rowData: any;
  public tableColumns: any;
  public eventsTypeList: object;
  constructor(private dataService: DataService) {
    this.tableColumns = [
      { name: 'name', display: 'absentUser.monthColumn.name' },
      { name: 'type', display: 'absentUser.monthColumn.type' },
      { name: 'day', display: 'absentUser.monthColumn.day' },
    ];
    this.eventsTypeList = {
      birthday: { icon: 'cake', color: '#fe8940', title: 'Birthday' },
      anniversary: { icon: 'star', color: '#a8d3fa', title: 'Anniversary' },
    };
  }

  ngOnInit(): void {
    this.rowData = this.dataService.getObservableData(
      '/users/birthday-anniversary',
    );
  }
}
