import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SharedModule } from '../../../../theme/shared/shared.module';
import { FormControl, Validators } from '@angular/forms';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-task-phase-sort',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    SharedModule,
    CdkDropList,
    CdkDrag,
    TranslateModule,
  ],
  templateUrl: './task-phase-sort.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './task-phase-sort.component.scss',
})
export class TaskPhaseSortComponent {
  // form control title
  public phasesOrder: FormControl = new FormControl([], Validators.required);
  constructor(
    public dialog: MatDialog,
    public matDialogRef: MatDialogRef<TaskPhaseSortComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.phasesOrder.setValue(data.projectPhasesRelations);
  }
  onSubmit() {
    // change orderID
    const newPhaseOrder = this.phasesOrder.value.map((phase, index) => {
      phase.orderId = index + 1;
      return phase;
    });

    this.phasesOrder.setValue(newPhaseOrder);

    const result = {
      projectPhasesRelations: this.phasesOrder.value,
    };

    this.matDialogRef.close({ result });
  }
  dropPhase(event: CdkDragDrop<string[]>) {
    moveItemInArray(
      this.phasesOrder.value,
      event.previousIndex,
      event.currentIndex,
    );
  }
}
