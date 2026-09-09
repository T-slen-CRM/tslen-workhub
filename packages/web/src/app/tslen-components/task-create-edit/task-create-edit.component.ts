import {
  AfterViewChecked,
  Component,
  ElementRef,
  Inject,
  OnInit,
  signal,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ITask, ITextEditor } from '../../interfaces/tasks';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ComponentsModule } from '../../components/components.module';
import { AuthData, AuthenticationService } from '../../services/auth.service';
import { MatSelectModule } from '@angular/material/select';
import { HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { TaskAttachment } from '@tslen-workhub/shared';
import { ProgressbarBootstrapComponent } from '../progressbar-bootstrap/progressbar-bootstrap.component';
import { IProgressInfo } from '../progressbar-bootstrap/interface/progressbar';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { PreviewModalComponent } from '../../components/preview-modal/preview-modal.component';
import { DeleteConfirmModalComponent } from '../../components/delete-confirm-modal/delete-confirm-modal.component';
import { DataService } from '../../services/data.service';
import { ToastrService } from 'ngx-toastr';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';
import { TextEditorComponent } from '../text-editor/text-editor.component';
import { TaskCommentsComponent } from '../task-comments/task-comments.component';
import { TaskHistoryComponent } from '../task-history/task-history.component';
import { LoadingButtonComponent } from '../../helpers/loading-button/loading-button.component';

@Component({
  selector: 'app-task-create-edit',
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    ComponentsModule,
    MatSelectModule,
    ProgressbarBootstrapComponent,
    MatListModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    TranslateModule,
    TextEditorComponent,
    TaskCommentsComponent,
    TaskHistoryComponent,
    LoadingButtonComponent,
  ],
  templateUrl: './task-create-edit.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./task-create-edit.component.scss'],
})
export class TaskCreateEditComponent implements OnInit, AfterViewChecked {
  public form: FormGroup;
  public incomingProject: ITask;
  public deleteDisabled: boolean;
  public selectedAssignee: any;
  public projectMembers: any[] = [];
  private authData: AuthData;
  public today = new Date();
  public descriptionEditing = signal<boolean>(false);
  public descriptionExpanded = signal<boolean>(false);
  public descriptionOverflowing = signal<boolean>(false);
  public titleEditing = signal<boolean>(false);
  public activeActivityTab = signal<'all' | 'comments' | 'history'>('all');
  @ViewChild('descriptionPreviewEl')
  descriptionPreviewEl?: ElementRef<HTMLElement>;
  public priorityList = [
    { value: 'low', viewValue: 'task.form.priority_low' },
    { value: 'medium', viewValue: 'task.form.priority_medium' },
    { value: 'high', viewValue: 'task.form.priority_high' },
  ];
  public acceptedFileTypes = `image/png, image/jpeg, image/gif`;
  public uploadLimit = 5;
  public taskId = null;
  public attachments = [];
  // Uploads fire immediately on file selection (not deferred to Save) - see
  // onFilesSelected(). Progress is tracked per upload batch, not per file,
  // since the backend endpoint already accepts a whole FileList in one
  // request (FilesInterceptor('attachments', 10, ...)).
  public uploadProgressInfos: IProgressInfo[] = [];
  public isUploadingAttachments = signal<boolean>(false);
  public textEditorConfig: ITextEditor = {
    minHeight: '400px',
    showToolbar: true,
    placeholder: 'Enter task description...',
    toolbarHiddenButtons: [
      ['undo', 'redo', 'subscript', 'superscript', 'fontName', 'fonts'],
      [
        'fontSize',
        'textColor',
        'backgroundColor',
        'customClasses',
        'link',
        'unlink',
        'insertImage',
        'insertVideo',
        'insertHorizontalRule',
        'removeFormat',
        'toggleEditorMode',
      ],
    ],
  };

  constructor(
    public dialog: MatDialog,
    public matDialogRef: MatDialogRef<TaskCreateEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private formBuilder: FormBuilder,
    private authService: AuthenticationService,
    private dataService: DataService,
    private toastr: ToastrService,
    private sanitizer: DomSanitizer,
  ) {
    this.authData = this.authService.authDataSignal();
    this.today.setHours(0, 0, 0, 0);
  }

  ngOnInit() {
    this.projectMembers = this.data.projectMembers;
    this.createForm();
    if (this.data && this.data.task) {
      this.incomingProject = this.data.task;
      this.form.patchValue(this.data.task);
      this.form
        .get('slackChannelAlert')
        .patchValue(this.data.slackChannelAlert);
      this.taskId = this.form.value.id;
      this.attachments = this.data.task?.taskAttachments || [];
      this.patchAdditionalFormValues(false);
    } else {
      this.form.patchValue(this.data);
      this.patchAdditionalFormValues(true);
      this.deleteDisabled = true;
    }
    if (
      this.incomingProject &&
      this.incomingProject?.taskUserAssignmentRelations?.length > 0
    ) {
      this.selectedAssignee = this.convertDataForAutoComplete(
        this.incomingProject.taskUserAssignmentRelations,
      );
    }
    // A new task has nothing to preview yet, so both open directly in edit
    // mode; an existing task always opens in preview/plain-text mode, even
    // with an empty description or (implausibly, given validation) title -
    // the point is "nothing to edit right now", not "nothing to show".
    this.descriptionEditing.set(!this.taskId);
    this.titleEditing.set(!this.taskId);
  }

  safeDescriptionHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      this.form.get('description').value ?? '',
    );
  }

  ngAfterViewChecked(): void {
    if (
      this.descriptionEditing() ||
      this.descriptionExpanded() ||
      !this.descriptionPreviewEl
    ) {
      return;
    }
    const el = this.descriptionPreviewEl.nativeElement;
    const isOverflowing = el.scrollHeight > el.clientHeight;
    if (isOverflowing !== this.descriptionOverflowing()) {
      this.descriptionOverflowing.set(isOverflowing);
    }
  }

  closeDialog(action: string, result: any) {
    this.matDialogRef.close({ result, action });
  }

  onSubmit() {
    if (this.form.valid) {
      let action = '';
      if (this.form.value.id) {
        // this.form.value.orderId = 45;
        action = 'update';
      } else {
        action = 'save';
      }
      // Attachments are already uploaded/persisted by now (see
      // onFilesSelected) - this.attachments is the full, current list.
      this.form.patchValue({ taskAttachments: this.attachments });
      this.closeDialog(action, this.form.value);
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
      title: ['', Validators.required],
      assignessEmail: [],
      createdBy: [],
      createdByName: [],
      description: [],
      estimate: [null],
      label: [],
      phaseId: [1],
      projectId: [],
      phaseName: [],
      projectName: [],
      createdAt: [],
      updatedAt: [new Date()],
      orderId: 0,
      // tasks.priority is NOT NULL in Postgres - default to a real value
      // (not '' or null) so a quick "just type a title and save" flow
      // stays valid, and require it explicitly so the form can't be
      // cleared into an invalid state.
      priority: ['medium', Validators.required],
      taskAttachments: [],
      slackChannelAlert: [''],
      taskUserAssignmentRelations: [[]],
      createMeetingSpace: false,
    });
  }
  getSelectedValues(event) {
    this.selectedAssignee = event.data;
    const currentAssignees = this.selectedAssignee.map((item) => {
      return { userId: item.value };
    });
    this.form.get('taskUserAssignmentRelations').patchValue(currentAssignees);
  }
  patchAdditionalFormValues(isNewTask: boolean) {
    this.form.patchValue({ updatedAt: new Date() });
    if (isNewTask) {
      this.form.patchValue({ createdAt: new Date() });
      this.form.patchValue({ createdBy: this.authData.email });
      this.form.patchValue({
        createdByName: `${this.authData.firstName} ${this.authData.lastName}`,
      });
    }
  }
  convertDataForAutoComplete(taskUserAssignmentRelations: any[]) {
    return taskUserAssignmentRelations.map((item) => {
      const user = item.user;
      return { value: user.id, group: user.firstName + ' ' + user.lastName };
    });
  }

  // Uploads on selection instead of waiting for Save, so an attachment
  // shows up in the chip list (and is safe from a lost/crashed dialog)
  // immediately - see this repo's Workhub task history for why. The
  // backend endpoint already accepts a whole file batch in one request
  // (FilesInterceptor('attachments', 10, ...)), so this uploads the whole
  // selection together rather than one request per file.
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) {
      return;
    }
    if (files.length > this.uploadLimit) {
      this.toastr.error(
        `You can only upload up to ${this.uploadLimit} files.`,
      );
      input.value = '';
      return;
    }
    // Matches the backend's own limits (FilesExtensionValidatorPipe /
    // MaxFileSizeValidator in tasks.controller.ts) so a rejection shows up
    // here instead of as a failed upload after the fact.
    const maxSizeBytes = 2 * 1024 * 1024;
    const oversized = [...files].filter((file) => file.size > maxSizeBytes);
    if (oversized.length > 0) {
      this.toastr.error(
        `${oversized.map((file) => file.name).join(', ')} exceed the 2MB limit.`,
      );
      input.value = '';
      return;
    }

    const formData = new FormData();
    for (const file of files) {
      formData.append('attachments', file);
    }

    this.uploadProgressInfos = [
      { value: 0, name: `${files.length} file${files.length > 1 ? 's' : ''}` },
    ];
    this.isUploadingAttachments.set(true);
    this.dataService
      .uploadPostData(
        '/tasks/upload-attachments?userId=' + this.authData.id,
        formData,
      )
      .subscribe({
        next: (uploadEvent: HttpEvent<TaskAttachment[]>) => {
          if (uploadEvent.type === HttpEventType.UploadProgress) {
            this.uploadProgressInfos[0].value = Math.round(
              (100 * uploadEvent.loaded) / (uploadEvent.total ?? uploadEvent.loaded),
            );
          } else if (uploadEvent instanceof HttpResponse) {
            this.attachments = [...this.attachments, ...(uploadEvent.body ?? [])];
            this.isUploadingAttachments.set(false);
            this.uploadProgressInfos = [];
            this.toastr.success('Files uploaded successfully');
            input.value = '';
          }
        },
        error: () => {
          this.isUploadingAttachments.set(false);
          this.uploadProgressInfos = [];
          this.toastr.error('Could not upload the file(s)');
          input.value = '';
        },
      });
  }

  getAttachmentIcon(fileName: string): string {
    const extension = (fileName ?? '').split('.').pop()?.toLowerCase() ?? '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
      return 'image';
    }
    if (extension === 'pdf') {
      return 'picture_as_pdf';
    }
    if (['doc', 'docx'].includes(extension)) {
      return 'description';
    }
    if (['xls', 'xlsx', 'csv'].includes(extension)) {
      return 'table_chart';
    }
    if (['zip', 'rar', '7z'].includes(extension)) {
      return 'folder_zip';
    }
    return 'insert_drive_file';
  }

  openPreview(event) {
    this.dialog.open(PreviewModalComponent, {
      width: '80%',
      data: { url: event },
    });
  }
  deleteAttachment(event) {
    const result = this.dialog.open(DeleteConfirmModalComponent, {
      width: '30%',
      data: {
        title: 'Delete attachment',
        text: 'Are you sure you want to delete this attachment?',
      },
    });
    result.afterClosed().subscribe((res) => {
      if (res) {
        this.dataService
          .deleteData(`/tasks/delete-attachment/`, event)
          .subscribe((_response) => {
            this.toastr.success('Attachment has been deleted', 'Success');
            this.attachments = this.attachments.filter(
              (item) => item.id !== event,
            );
            this.form.get('taskAttachments').patchValue(this.attachments);
          });
      } else {
      }
    });
  }
  resetEstimate() {
    this.form.get('estimate').reset();
  }
}
