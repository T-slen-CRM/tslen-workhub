import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

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

  function configure(data: any) {
    const dataServiceSpy = jasmine.createSpyObj('DataService', ['getObservableData', 'postData', 'postImage', 'deleteData']);
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
});
