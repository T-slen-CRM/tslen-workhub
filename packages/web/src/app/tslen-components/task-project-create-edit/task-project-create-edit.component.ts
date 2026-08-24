import {
  Component,
  Inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ITaskProject } from '../../interfaces/tasks';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ImageSelectionComponent } from '../image-selection/image-selection.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthData, AuthenticationService } from '../../services/auth.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-task-project-create-edit',
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    FormsModule,
    ImageSelectionComponent,
    MatIconModule,
    MatTooltipModule,
    TranslateModule,
  ],
  templateUrl: './task-project-create-edit.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./task-project-create-edit.component.scss'],
})
export class TaskProjectCreateEditComponent implements OnInit {
  public form: FormGroup;
  public incomingProject: ITaskProject;
  public deleteDisabled: boolean;
  private authData: AuthData = this.authService.authDataSignal();

  constructor(
    public dialog: MatDialog,
    public matDialogRef: MatDialogRef<TaskProjectCreateEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private formBuilder: FormBuilder,
    private authService: AuthenticationService,
  ) {}

  ngOnInit() {
    this.createForm();
    if (this.data && this.data.project) {
      this.incomingProject = this.data.project;
      this.form.patchValue(this.data.project);
    } else {
      this.deleteDisabled = true;
    }
  }

  closeDialog(action: string, result: any) {
    this.matDialogRef.close({ result, action });
  }

  onSubmit() {
    if (this.form.valid) {
      this.form
        .get('slackChannel')
        .patchValue(
          this.form.value.slackChannel
            ? this.form.value.slackChannel.trim()
            : this.form.value.slackChannel,
        );
      if (this.incomingProject) {
        this.closeDialog('edit', this.form.value);
      } else {
        this.closeDialog('save', this.form.value);
      }
    }
  }

  onDelete() {
    if (this.incomingProject) {
      this.closeDialog('delete', this.incomingProject);
    }
  }

  createForm() {
    this.form = this.formBuilder.group({
      id: null,
      userId: this.authData.id,
      name: ['', Validators.required],
      isPrivate: [0],
      logo: 'not_interested',
      members: '',
      slackChannel: '',
      description: '',
      companyId: this.authData.companyId,
      taskProjectPermissions: [
        [{ userId: this.authData.id, permission: 'admin' }],
      ],
      createdAt: new Date(),
      phases: [
        [
          {
            name: 'All ideas',
          },
          {
            name: 'ToDo',
          },
          {
            name: 'Done',
          },
        ],
      ],
    });
  }
}
