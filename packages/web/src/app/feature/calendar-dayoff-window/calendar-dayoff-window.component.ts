import {Component, EventEmitter, inject, Input, OnInit, Output} from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {MatIconModule} from "@angular/material/icon";
import {ExpandCollapseBar} from "../../../animations/animations";

import {MatButtonModule} from "@angular/material/button";
import {MatTooltipModule} from "@angular/material/tooltip";
import {ModalDialogHeaderComponent} from "../../components/modal-dialog-header/modal-dialog-header.component";
import {IDaysOffStaticList, IFullEventList, LibsService} from "../../services/libs.service";
import {CalendarEvent} from "angular-calendar";
import { TranslateModule } from '@ngx-translate/core';
@Component({
    selector: 'app-calendar-dayoff-window',
    imports: [
        CommonModule, MatIconModule, MatTooltipModule, MatButtonModule, ModalDialogHeaderComponent, NgOptimizedImage, TranslateModule
    ],
    templateUrl: './calendar-dayoff-window.component.html',
    styleUrls: ['./calendar-dayoff-window.component.scss'],
    animations: [ExpandCollapseBar(200, 400)]
})
export class CalendarDayoffWindowComponent {
  @Input() public isOpenWindow = false;
  @Output() public isOpenWindowChange = new EventEmitter<boolean>(this.isOpenWindow);
  @Input() public clickedDate: Date;
  public eventsCategories: any[] = [];
  public events: { [key: string]: CalendarEvent[] } = {};

  @Input()
  public set setEvents(events: { [key: string]: CalendarEvent[] }) {
    this.events = events;
    this.eventsCategories = Object.keys(events);
  }

  @Input() public totalStaticEventIconList: IFullEventList;

  closeWindow() {
    this.isOpenWindow = false;
    this.isOpenWindowChange.emit(this.isOpenWindow);
  }
}
