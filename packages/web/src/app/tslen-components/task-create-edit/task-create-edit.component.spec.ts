import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, Subject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';

import { TaskCreateEditComponent } from './task-create-edit.component';
import { AuthenticationService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { TaskWebSocketService } from '../../pages/tasks-list/taskWebSocket.service';
import { ToastrService } from 'ngx-toastr';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AutocompleteComponent } from '../../components/autocomplete/autocomplete/autocomplete.component';

describe('TaskCreateEditComponent', () => {
  let component: TaskCreateEditComponent;
  let fixture: ComponentFixture<TaskCreateEditComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;

  function configure(data: any) {
    dataServiceSpy = jasmine.createSpyObj('DataService', ['getObservableData', 'postData', 'postImage', 'deleteData', 'uploadPostData']);
    dataServiceSpy.getObservableData.and.returnValue(of([]));
    return TestBed.configureTestingModule({
      imports: [TaskCreateEditComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        { provide: MAT_DIALOG_DATA, useValue: data },
        {
          provide: AuthenticationService,
          useValue: { authDataSignal: () => ({ email: 'a@b.com', firstName: 'A', lastName: 'B' }) },
        },
        { provide: DataService, useValue: dataServiceSpy },
        { provide: TaskWebSocketService, useValue: { getMessages: () => of(null) } },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
      ],
    }).compileComponents();
  }

  const newTaskData = { task: null, projectMembers: [], phaseList: [{ id: 1, name: 'To Do' }], slackChannelAlert: false };

  async function recreateWith(data: any) {
    TestBed.resetTestingModule();
    await configure(data);
    fixture = TestBed.createComponent(TaskCreateEditComponent);
    component = fixture.componentInstance;
  }

  beforeEach(async () => {
    await configure(newTaskData);
    fixture = TestBed.createComponent(TaskCreateEditComponent);
    component = fixture.componentInstance;
  });

  it('gives the Assignee autocomplete its own label, not the phase select\'s "Move card" label', () => {
    fixture.detectChanges();

    const autocomplete = fixture.debugElement.query(By.directive(AutocompleteComponent));

    expect(autocomplete.componentInstance.nameOfList).toBe('task.form.assignee');
  });

  describe('description preview/edit toggle', () => {
    const existingTaskData = {
      task: { id: 7, title: 'Existing', description: '<p>Some description</p>', taskUserAssignmentRelations: [] },
      projectMembers: [], phaseList: [{ id: 1, name: 'To Do' }], slackChannelAlert: false,
    };

    it('starts in edit mode for a new task (no description yet)', () => {
      fixture.detectChanges();

      expect(component.descriptionEditing()).toBeTrue();
    });

    it('starts in preview mode for an existing task that already has a description', async () => {
      await recreateWith(existingTaskData);
      fixture.detectChanges();

      expect(component.descriptionEditing()).toBeFalse();
    });

    it('stays in preview mode for an existing task with an EMPTY description, instead of jumping to edit mode', async () => {
      await recreateWith({
        task: { id: 8, title: 'Existing, no description yet', description: null, taskUserAssignmentRelations: [] },
        projectMembers: [], phaseList: [{ id: 1, name: 'To Do' }], slackChannelAlert: false,
      });
      fixture.detectChanges();

      expect(component.descriptionEditing()).toBeFalse();
    });

    it('toggles into edit mode and back to preview via the explicit Edit/Done toggle, without touching the form value', async () => {
      await recreateWith(existingTaskData);
      fixture.detectChanges();

      component.descriptionEditing.set(true);
      expect(component.descriptionEditing()).toBeTrue();
      expect(component.form.get('description').value).toBe('<p>Some description</p>');

      component.descriptionEditing.set(false);
      expect(component.descriptionEditing()).toBeFalse();
      expect(component.form.get('description').value).toBe('<p>Some description</p>');
    });

    it('renders the stored description HTML through the sanitizer for preview', async () => {
      await recreateWith(existingTaskData);
      fixture.detectChanges();

      const safe = component.safeDescriptionHtml();

      expect(safe).toBeTruthy();
    });
  });

  describe('title preview/edit toggle', () => {
    const existingTaskData = {
      task: { id: 7, title: 'Existing title', description: '', taskUserAssignmentRelations: [] },
      projectMembers: [], phaseList: [{ id: 1, name: 'To Do' }], slackChannelAlert: false,
    };

    it('starts in edit mode for a new task', () => {
      fixture.detectChanges();

      expect(component.titleEditing()).toBeTrue();
    });

    it('starts in preview mode for an existing task, showing the title as plain text', async () => {
      await recreateWith(existingTaskData);
      fixture.detectChanges();

      expect(component.titleEditing()).toBeFalse();
      expect(component.form.get('title').value).toBe('Existing title');
    });

    it('toggles into edit mode and back without touching the form value', async () => {
      await recreateWith(existingTaskData);
      fixture.detectChanges();

      component.titleEditing.set(true);
      expect(component.titleEditing()).toBeTrue();

      component.titleEditing.set(false);
      expect(component.titleEditing()).toBeFalse();
      expect(component.form.get('title').value).toBe('Existing title');
    });
  });

  describe('new task priority default', () => {
    // tasks.priority is NOT NULL in Postgres, and CreateTaskDto now
    // requires it too (see create-task.dto.ts) - '' failed DTO validation,
    // null passed validation but violated the DB constraint. A real
    // default keeps the "just type a title and save" flow working while
    // always sending a value the backend accepts.
    it('defaults to a valid, non-null priority', () => {
      fixture.detectChanges();

      expect(component.form.get('priority').value).toBe('medium');
    });

    it('is required, so the form can\'t be submitted with priority cleared', () => {
      fixture.detectChanges();

      component.form.get('priority').setValue(null);

      expect(component.form.get('priority').valid).toBeFalse();
    });
  });

  describe('Activity tabs', () => {
    it('defaults to the "all" tab', () => {
      fixture.detectChanges();

      expect(component.activeActivityTab()).toBe('all');
    });

    it('switches tabs without affecting the form', () => {
      fixture.detectChanges();

      component.activeActivityTab.set('history');

      expect(component.activeActivityTab()).toBe('history');
      expect(component.form.get('title').value).toBe('');
    });
  });

  describe('onFilesSelected (immediate attachment upload)', () => {
    function fileInputEvent(files: File[]): Event {
      const input = document.createElement('input');
      input.type = 'file';
      Object.defineProperty(input, 'files', { value: files });
      return { target: input } as unknown as Event;
    }

    beforeEach(() => {
      fixture.detectChanges();
    });

    it('uploads the selection immediately, without waiting for Save', () => {
      const upload$ = new Subject<HttpEvent<unknown>>();
      dataServiceSpy.uploadPostData.and.returnValue(upload$);
      const file = new File(['content'], 'photo.png', { type: 'image/png' });

      component.onFilesSelected(fileInputEvent([file]));

      expect(dataServiceSpy.uploadPostData).toHaveBeenCalled();
      const [path, formData] = dataServiceSpy.uploadPostData.calls.mostRecent().args;
      expect(path).toContain('/tasks/upload-attachments');
      expect(formData.getAll('attachments')).toEqual([file]);
      expect(component.isUploadingAttachments()).toBeTrue();
    });

    it('merges the returned attachment rows into the chip list on success, without needing Save', () => {
      const upload$ = new Subject<HttpEvent<unknown>>();
      dataServiceSpy.uploadPostData.and.returnValue(upload$);
      const file = new File(['content'], 'photo.png', { type: 'image/png' });
      component.attachments = [];

      component.onFilesSelected(fileInputEvent([file]));
      upload$.next(new HttpResponse({ body: [{ id: 1, originName: 'photo.png', url: '/x' }] }));

      expect(component.attachments).toEqual([{ id: 1, originName: 'photo.png', url: '/x' }]);
      expect(component.isUploadingAttachments()).toBeFalse();
    });

    it('shows a spinner on the Add attachment button while the upload is in flight', () => {
      const upload$ = new Subject<HttpEvent<unknown>>();
      dataServiceSpy.uploadPostData.and.returnValue(upload$);
      const file = new File(['content'], 'photo.png', { type: 'image/png' });

      component.onFilesSelected(fileInputEvent([file]));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('mat-spinner')).not.toBeNull();

      upload$.next(new HttpResponse({ body: [] }));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('mat-spinner')).toBeNull();
    });

    it('tracks upload progress while the request is in flight', () => {
      const upload$ = new Subject<HttpEvent<unknown>>();
      dataServiceSpy.uploadPostData.and.returnValue(upload$);
      const file = new File(['content'], 'photo.png', { type: 'image/png' });

      component.onFilesSelected(fileInputEvent([file]));
      upload$.next({ type: HttpEventType.UploadProgress, loaded: 50, total: 100 });

      expect(component.uploadProgressInfos[0].value).toBe(50);
    });

    it('shows an error and resets uploading state when the upload fails', () => {
      const upload$ = new Subject<HttpEvent<unknown>>();
      dataServiceSpy.uploadPostData.and.returnValue(upload$);
      const toastrSpy = TestBed.inject(ToastrService) as unknown as jasmine.SpyObj<ToastrService>;
      const file = new File(['content'], 'photo.png', { type: 'image/png' });

      component.onFilesSelected(fileInputEvent([file]));
      upload$.error(new Error('network down'));

      expect(component.isUploadingAttachments()).toBeFalse();
      expect(toastrSpy.error).toHaveBeenCalled();
    });

    it('rejects a file over the 2MB backend limit client-side, without calling the upload endpoint', () => {
      const bigContent = new Uint8Array(2 * 1024 * 1024 + 1);
      const file = new File([bigContent], 'huge.png', { type: 'image/png' });

      component.onFilesSelected(fileInputEvent([file]));

      expect(dataServiceSpy.uploadPostData).not.toHaveBeenCalled();
    });

    it('rejects a selection larger than the upload limit, without calling the upload endpoint', () => {
      const files = Array.from(
        { length: component.uploadLimit + 1 },
        (_, i) => new File(['x'], `f${i}.png`, { type: 'image/png' }),
      );

      component.onFilesSelected(fileInputEvent(files));

      expect(dataServiceSpy.uploadPostData).not.toHaveBeenCalled();
    });
  });
});
