import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

import { TaskPhaseCreateEditComponent } from './task-phase-create-edit.component';

describe('TaskPhaseCreateEditComponent', () => {
  let component: TaskPhaseCreateEditComponent;
  let fixture: ComponentFixture<TaskPhaseCreateEditComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<TaskPhaseCreateEditComponent>>;

  function createComponent(data: unknown): void {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [TaskPhaseCreateEditComponent, TranslateModule.forRoot()],
      providers: [
        { provide: MatDialog, useValue: {} },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskPhaseCreateEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('defaults isMuted to false when creating a new phase', () => {
    createComponent({ projectId: 1 });

    expect(component.isMuted.value).toBe(false);
  });

  it('includes isMuted (false by default) in the submitted result when creating', () => {
    createComponent({ projectId: 1 });
    component.title.setValue('New phase');

    component.onSubmit();

    const [{ result, action }] = dialogRefSpy.close.calls.mostRecent().args;
    expect(action).toBe('create');
    expect(result.isMuted).toBe(false);
  });

  it('initializes isMuted from the phase being edited', () => {
    createComponent({ projectId: 1, phase: { id: 5, name: 'Done', isMuted: true } });

    expect(component.isMuted.value).toBe(true);
  });

  it('preserves the toggled isMuted value in the submitted result when editing', () => {
    createComponent({ projectId: 1, phase: { id: 5, name: 'Done', isMuted: true } });
    component.isMuted.setValue(false);

    component.onSubmit();

    const [{ result, action }] = dialogRefSpy.close.calls.mostRecent().args;
    expect(action).toBe('edit');
    expect(result.isMuted).toBe(false);
  });

  it('does not send projectPhasesRelations when editing, so the board position is untouched', () => {
    createComponent({
      projectId: 1,
      phase: { id: 5, name: 'Done', isMuted: true },
      projectPhasesRelations: [{ projectId: 1, phaseId: 5, orderId: 2 }],
    });

    component.onSubmit();

    const [{ result }] = dialogRefSpy.close.calls.mostRecent().args;
    expect(result.projectPhasesRelations).toBeUndefined();
  });

  it('assigns a new phase the next orderId after the existing ones, not a hardcoded 1', () => {
    createComponent({
      projectId: 1,
      projectPhasesRelations: [
        { projectId: 1, phaseId: 10, orderId: 1 },
        { projectId: 1, phaseId: 11, orderId: 2 },
      ],
    });
    component.title.setValue('New phase');

    component.onSubmit();

    const [{ result }] = dialogRefSpy.close.calls.mostRecent().args;
    expect(result.projectPhasesRelations).toEqual([
      { projectId: 1, orderId: 3 },
    ]);
  });

  it('assigns orderId 1 to the first phase of a project with none yet', () => {
    createComponent({ projectId: 1 });
    component.title.setValue('First phase');

    component.onSubmit();

    const [{ result }] = dialogRefSpy.close.calls.mostRecent().args;
    expect(result.projectPhasesRelations).toEqual([
      { projectId: 1, orderId: 1 },
    ]);
  });
});
