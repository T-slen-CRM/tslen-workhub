import {AfterViewChecked, Component, ElementRef, Inject, OnInit, signal, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

import {MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef} from "@angular/material/dialog";
import {ITask, ITextEditor} from "../../interfaces/tasks";
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from "@angular/material/button";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatTooltipModule} from "@angular/material/tooltip";
import {ComponentsModule} from "../../components/components.module";
import {AuthData, AuthenticationService} from "../../services/auth.service";
import {MatSelectModule} from '@angular/material/select';
import {UploadFilesComponent} from '../upload-files/upload-files.component';
import {MatListModule} from '@angular/material/list';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {PreviewModalComponent} from '../../components/preview-modal/preview-modal.component';
import {DeleteConfirmModalComponent} from '../../components/delete-confirm-modal/delete-confirm-modal.component';
import {DataService} from '../../services/data.service';
import {ToastrService} from 'ngx-toastr';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {DateAdapter} from 'angular-calendar';
import {MAT_MOMENT_DATE_ADAPTER_OPTIONS, MomentDateAdapter} from '@angular/material-moment-adapter';
import {MAT_DATE_LOCALE, MatNativeDateModule} from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';
import {TextEditorComponent} from "../text-editor/text-editor.component";
import {TaskCommentsComponent} from "../task-comments/task-comments.component";


@Component({
    selector: 'app-task-create-edit',
    imports: [
        CommonModule, MatDialogModule, ReactiveFormsModule,
        MatFormFieldModule, MatInputModule, MatButtonModule,
        FormsModule, MatIconModule, MatTooltipModule, ComponentsModule,
        MatSelectModule, UploadFilesComponent, MatListModule,
        MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, TranslateModule, TextEditorComponent,
        TaskCommentsComponent
    ],
    templateUrl: './task-create-edit.component.html',
    styleUrls: ['./task-create-edit.component.scss'],
    providers: [
        {
            provide: DateAdapter,
            useClass: MomentDateAdapter,
            deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS]
        },
        { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } }
    ]
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
  @ViewChild('descriptionPreviewEl') descriptionPreviewEl?: ElementRef<HTMLElement>;
  public priorityList = [
    {value: 'low', viewValue: 'task.form.priority_low'},
    {value: 'medium', viewValue: 'task.form.priority_medium'},
    {value: 'high', viewValue: 'task.form.priority_high'}  ];
  public acceptedFileTypes = `image/png, image/jpeg, image/gif`;
  public uploadLimit = 5;
  public taskId = null;
  public attachments = [];
  public textEditorConfig: ITextEditor = {
    minHeight: '400px',
    showToolbar: true,
    placeholder: 'Enter task description...',
    toolbarHiddenButtons: [
     [
      'undo',
      'redo',
      'subscript',
      'superscript',
      'fontName',
       'fonts'
     ],
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
        'toggleEditorMode'
       ]
    ]
  }


  constructor(public dialog: MatDialog,
              public matDialogRef: MatDialogRef<TaskCreateEditComponent>,
              @Inject(MAT_DIALOG_DATA) public data: any,
              private formBuilder: FormBuilder,
              private authService: AuthenticationService,
              private dataService: DataService,
              private toastr: ToastrService,
              private sanitizer: DomSanitizer){
    this.authData = this.authService.authDataSignal();
    this.today.setHours(0, 0, 0, 0);
  }

  ngOnInit() {
    this.projectMembers = this.data.projectMembers;
    this.createForm();
    if (this.data && this.data.task){
      this.incomingProject = this.data.task;
      this.form.patchValue(this.data.task);
      this.form.get('slackChannelAlert').patchValue(this.data.slackChannelAlert);
      this.taskId = this.form.value.id;
      this.attachments = this.data.task?.taskAttachments || [];
      this.patchAdditionalFormValues(false);
    } else {
      this.form.patchValue(this.data);
      this.patchAdditionalFormValues(true);
      this.deleteDisabled = true;
    }
    if (this.incomingProject && this.incomingProject?.taskUserAssignmentRelations?.length > 0) {
      this.selectedAssignee = this.convertDataForAutoComplete(this.incomingProject.taskUserAssignmentRelations);
    }
    // A new task has nothing to preview yet, so both open directly in edit
    // mode; an existing task always opens in preview/plain-text mode, even
    // with an empty description or (implausibly, given validation) title -
    // the point is "nothing to edit right now", not "nothing to show".
    this.descriptionEditing.set(!this.taskId);
    this.titleEditing.set(!this.taskId);
  }

  safeDescriptionHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.form.get('description').value ?? '');
  }

  ngAfterViewChecked(): void {
    if (this.descriptionEditing() || this.descriptionExpanded() || !this.descriptionPreviewEl) {
      return;
    }
    const el = this.descriptionPreviewEl.nativeElement;
    const isOverflowing = el.scrollHeight > el.clientHeight;
    if (isOverflowing !== this.descriptionOverflowing()) {
      this.descriptionOverflowing.set(isOverflowing);
    }
  }

  closeDialog(action: string, result: any) {
    this.matDialogRef.close({result, action});
  }

  onSubmit() {

    if (this.form.valid) {
      let action = '';
      if (this.form.value.id){
        // this.form.value.orderId = 45;
        action = 'update';
      } else {
        action = 'save';
      }
      // concat attachments
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
      priority: [''],
      taskAttachments: [],
      previousTaskAttachments: [],
      slackChannelAlert: [''],
      taskUserAssignmentRelations: [[]],
      createMeetingSpace: false,
    });
  }
  getSelectedValues(event) {
    this.selectedAssignee = event.data;
    const currentAssignees = this.selectedAssignee.map(item => {
      return {userId: item.value}
    });
    this.form.get('taskUserAssignmentRelations').patchValue(currentAssignees);
    // if (this.selectedAssignee.length === 1) {
    //   this.form.patchValue({assignessEmail: this.selectedAssignee[0].value});
    // }
    // else if (this.selectedAssignee.length > 1) {
    //   const joinedValue = this.selectedAssignee.map(item => item.value).join('|');
    //   this.form.patchValue({assignessEmail: joinedValue});
    // }
  }
  patchAdditionalFormValues(isNewTask: boolean) {
    this.form.patchValue({ updatedAt: new Date()});
    this.form.patchValue({previousTaskAttachments: this.attachments});
    if (isNewTask) {
      this.form.patchValue({createdAt: new Date()});
      this.form.patchValue({createdBy: this.authData.email});
      this.form.patchValue({createdByName: `${this.authData.firstName} ${this.authData.lastName}`});
    }
  }
  convertDataForAutoComplete(taskUserAssignmentRelations: any[]){
      return taskUserAssignmentRelations.map(item => {
        const user = item.user;
        return {value: user.id, group: user.firstName + ' ' + user.lastName}
      })
  }

  openPreview(event){
    this.dialog.open(PreviewModalComponent, {
        width: '80%',
        data: {url: event}
    });
  }
  deleteAttachment(event){
    const result = this.dialog.open(DeleteConfirmModalComponent, {
        width: '30%',
        data: {
          title: 'Delete attachment',
          text: 'Are you sure you want to delete this attachment?'}
    });
    result.afterClosed().subscribe((res) => {
        if (res) {
          this.dataService.deleteData(`/tasks/delete-attachment/`, event).subscribe(response => {
          this.toastr.success('Attachment has been deleted', 'Success');
          this.attachments = this.attachments.filter(item => item.id !== event);
          this.form.get('taskAttachments').patchValue(this.attachments);
          });
        }
        else{
        }
    });
  }
  resetEstimate() {
    this.form.get('estimate').reset();
  }

}
