import {Component, Input, OnInit} from '@angular/core';
import {MatTableModule} from "@angular/material/table";
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {FlatpickrModule} from "angularx-flatpickr";
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatTooltipModule} from "@angular/material/tooltip";
import {LibsService} from "../../services/libs.service";
import { TranslateModule} from '@ngx-translate/core';
import { LanguageService } from 'src/app/language/language.service';

@Component({
    selector: 'app-mat-table',
    templateUrl: './mat-table.component.html',
    styleUrls: ['./mat-table.component.scss'],
    imports: [
        CommonModule, MatTableModule, FormsModule, FlatpickrModule,
        TranslateModule,
        MatInputModule, MatButtonModule, MatIconModule, MatTooltipModule
    ]
})
export class MatTableComponent implements OnInit {
  public displayedColumns: any[] = [];
  public originObjectDisplayedColumns = [];
  public dataSource: any[] = [];
  @Input() public set setDisplayedColumns(data: any){
    this.originObjectDisplayedColumns = data;
    this.displayedColumns = data.map(item => item.name);
  }
  @Input() public set setDataSource(data: any){
    this.dataSource = data;
  }
  @Input() tableName: string[];
  @Input() hideHeaders: boolean;
  @Input() noData: string;
  @Input() public eventsTypeList: object;

  constructor(public translateService: LanguageService) {}

  ngOnInit(): void {
  }
  deleteEvent() {
    // this.events = this.events.filter((event) => event !== eventToDelete);
  }

}
