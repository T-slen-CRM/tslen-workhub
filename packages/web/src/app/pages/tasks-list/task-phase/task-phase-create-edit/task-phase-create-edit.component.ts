import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ITaskPhase } from '../../../../interfaces/tasks';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-task-phase-create-edit',
  imports: [
    MatButtonModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatInputModule,
    MatSlideToggleModule,
    TranslateModule,
  ],
  templateUrl: './task-phase-create-edit.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './task-phase-create-edit.component.scss',
})
export class TaskPhaseCreateEditComponent {
  // form control title
  public title: FormControl = new FormControl('', Validators.required);
  // Renders this phase's task cards greyed-out/inactive on the board.
  public isMuted: FormControl = new FormControl(false);
  constructor(
    public dialog: MatDialog,
    public matDialogRef: MatDialogRef<TaskPhaseCreateEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    if (data.phase) {
      this.title.setValue(data.phase.name);
      this.isMuted.setValue(!!data.phase.isMuted);
    }
  }
  onSubmit() {
    const result: ITaskPhase = {
      id: null,
      name: this.title.value,
      isMuted: this.isMuted.value,
      projectPhasesRelations: [
        {
          projectId: this.data.projectId,
          orderId: 1,
        },
      ],
    };
    let action = 'create';
    if (this.data && this.data.phase) {
      action = 'edit';
      result.id = this.data.phase.id;
    }
    this.matDialogRef.close({ result, action });
  }
}
