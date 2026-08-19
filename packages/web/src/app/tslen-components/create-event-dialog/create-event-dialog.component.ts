import {Component, Inject, OnInit, Output} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {CalendarEvent} from "angular-calendar";
import {Subject} from "rxjs";
import {endOfDay, startOfDay} from "date-fns";
import {setDayHours} from "../../helpers/utils";

export interface PeriodicElement {
  name: string;
  position: number;
  weight: number;
  symbol: string;
}

const ELEMENT_DATA: PeriodicElement[] = [
  {position: 1, name: 'Hydrogen', weight: 1.0079, symbol: 'H'},
  {position: 2, name: 'Helium', weight: 4.0026, symbol: 'He'},
  {position: 3, name: 'Lithium', weight: 6.941, symbol: 'Li'},
  {position: 4, name: 'Beryllium', weight: 9.0122, symbol: 'Be'},
  {position: 5, name: 'Boron', weight: 10.811, symbol: 'B'},
  {position: 6, name: 'Carbon', weight: 12.0107, symbol: 'C'},
  {position: 7, name: 'Nitrogen', weight: 14.0067, symbol: 'N'},
  {position: 8, name: 'Oxygen', weight: 15.9994, symbol: 'O'},
  {position: 9, name: 'Fluorine', weight: 18.9984, symbol: 'F'},
  {position: 10, name: 'Neon', weight: 20.1797, symbol: 'Ne'},
];
/**
 * @title Dialog with header, scrollable content and actions
 */
@Component({
    selector: 'app-create-event-dialog',
    templateUrl: './create-event-dialog.component.html',
    styleUrls: ['./create-event-dialog.component.scss'],
    standalone: false
})
export class CreateEventDialogComponent implements OnInit{
  // TODO: interface
  public events: CalendarEvent[];
  public refresh = new Subject<void>();
  public selectedDate: any;
  public eventsColumns: object[];

  constructor(public dialog: MatDialog,
              public matDialogRef: MatDialogRef<CreateEventDialogComponent>,
              @Inject(MAT_DIALOG_DATA) public data: any) {
    this.eventsColumns = [
        {name: 'title', display: 'Title'},
        {name: 'color', display: 'Color'},
        {name: 'start', display: 'Start'},
        {name: 'end', display: 'End'},
        {name: 'delete', display: 'Delete'},
    ]
  }

  ngOnInit() {
    this.selectedDate = this.data.date || new Date(); // if edit event use new Date()
    if (this.data.events && Array.isArray(this.data.events)){
      this.events = this.data.events;
    } else {
      this.events = [this.data.events]; /// if one event on edit
    }
    if (this.events.length < 1){
      this.addEvent();
    }
  }

  closeDialog() {
    this.matDialogRef.close({result: this.events});
  }
  onSubmit(){
    this.closeDialog();
  }
  deleteEvent(eventToDelete: CalendarEvent) {
    this.events = this.events.filter((event) => event !== eventToDelete);
  }
  addEvent(): void {
    this.events = [
      ...this.events,
      {
        title: 'New event',
        start: new Date(this.selectedDate),
        end: setDayHours(1, new Date(this.selectedDate), '+'),
        color: {primary: '#4680ff', secondary: '#4680ff'},
        draggable: true,
        resizable: {
          beforeStart: true,
          afterEnd: true,
        },
      },
    ];
  }
}
