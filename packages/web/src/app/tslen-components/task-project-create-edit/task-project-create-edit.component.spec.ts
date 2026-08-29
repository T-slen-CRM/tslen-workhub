import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

import { TaskProjectCreateEditComponent } from './task-project-create-edit.component';
import { AuthenticationService } from '../../services/auth.service';

describe('TaskProjectCreateEditComponent', () => {
  let component: TaskProjectCreateEditComponent;
  let fixture: ComponentFixture<TaskProjectCreateEditComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<TaskProjectCreateEditComponent>>;

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [TaskProjectCreateEditComponent, TranslateModule.forRoot()],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        {
          provide: AuthenticationService,
          useValue: { authDataSignal: () => ({ id: 1, companyId: 2 }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskProjectCreateEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // isPrivate is an int (0/1) column on the backend, but the mat-checkbox's
  // change event puts a real boolean into the form control once toggled.
  it('submits isPrivate as 1, not true, once the checkbox has been toggled on', () => {
    component.form.patchValue({ name: 'Project', isPrivate: true });

    component.onSubmit();

    const [{ result }] = dialogRefSpy.close.calls.mostRecent().args;
    expect(result.isPrivate).toBe(1);
  });

  it('submits isPrivate as 0 when left unchecked', () => {
    component.form.patchValue({ name: 'Project' });

    component.onSubmit();

    const [{ result }] = dialogRefSpy.close.calls.mostRecent().args;
    expect(result.isPrivate).toBe(0);
  });
});
