import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {DataService} from "../../services/data.service";
import {ComponentsModule} from "../../components/components.module";
import {MatTableComponent} from "../mat-table/mat-table.component";
import {LibsService} from "../../services/libs.service";
import { TranslateModule} from '@ngx-translate/core';
import { LanguageService } from 'src/app/language/language.service';

@Component({
    selector: 'app-absent-user',
    imports: [CommonModule, ComponentsModule, MatTableComponent, TranslateModule],
    templateUrl: './absent-user.component.html',
    styleUrls: ['./absent-user.component.scss']
})
export class AbsentUserComponent implements OnInit {
  public rowData: any;
  public tableColumns: any;
  public eventsTypeList: object;
  constructor(private dataService: DataService,
              private libsService: LibsService,
              public translateService: LanguageService
            ) {
    this.tableColumns = [
      {name: 'name', display: 'absentUser.header.name'},
      {name: 'type', display: 'absentUser.header.type'},
      {name: 'day', display: 'absentUser.header.day'},
    ];
  }

  ngOnInit(): void {
    this.rowData = this.dataService.getObservableData('/events-by-user/absent-today');
    this.eventsTypeList = this.libsService.daysOffList;
  }

}
