import {
  Component,
  Inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { CalendarEvent } from 'angular-calendar';
import { Subject } from 'rxjs';
import { setDayHours } from '../../helpers/utils';

/**
 * @title Dialog with header, scrollable content and actions
 */
@Component({
  selector: 'app-create-event-dialog',
  templateUrl: './create-event-dialog.component.html',
  styleUrls: ['./create-event-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class CreateEventDialogComponent implements OnInit {
  // TODO: interface
  public events: CalendarEvent[];
  public refresh = new Subject<void>();
  public selectedDate: any;
  public eventsColumns: object[];

  constructor(
    public dialog: MatDialog,
    public matDialogRef: MatDialogRef<CreateEventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.eventsColumns = [
      { name: 'title', display: 'Title' },
      { name: 'color', display: 'Color' },
      { name: 'start', display: 'Start' },
      { name: 'end', display: 'End' },
      { name: 'delete', display: 'Delete' },
    ];
  }

  ngOnInit() {
    this.selectedDate = this.data.date || new Date(); // if edit event use new Date()
    if (this.data.events && Array.isArray(this.data.events)) {
      this.events = this.data.events;
    } else {
      this.events = [this.data.events]; /// if one event on edit
    }
    if (this.events.length < 1) {
      this.addEvent();
    }
  }

  closeDialog() {
    this.matDialogRef.close({ result: this.events });
  }
  onSubmit() {
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
        color: { primary: '#4680ff', secondary: '#4680ff' },
        draggable: true,
        resizable: {
          beforeStart: true,
          afterEnd: true,
        },
      },
    ];
  }
}
