import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { ManageUserUpdateComponent } from './manage-user-update.component';
import { DataService } from '../../../services/data.service';

describe('ManageUserUpdateComponent', () => {
  let component: ManageUserUpdateComponent;
  let fixture: ComponentFixture<ManageUserUpdateComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;

  const existingUser = {
    id: 3,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    avatar: '/assets/images/profile/jane.png',
  };

  beforeEach(async () => {
    dataServiceSpy = jasmine.createSpyObj('DataService', ['getOneUser', 'updateData']);
    dataServiceSpy.getOneUser.and.returnValue(of({ body: existingUser }) as never);
    dataServiceSpy.updateData.and.returnValue(of({ status: 201 }) as never);

    await TestBed.configureTestingModule({
      declarations: [ManageUserUpdateComponent],
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: DataService, useValue: dataServiceSpy },
        { provide: Router, useValue: { url: '/admin/manage-user-update/3' } },
        { provide: MatDialog, useValue: {} },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success']) },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageUserUpdateComponent);
    component = fixture.componentInstance;
  });

  it('loads the user via the working getOneUser endpoint, not the broken admin-only one', () => {
    component.ngOnInit();

    expect(dataServiceSpy.getOneUser).toHaveBeenCalledWith(3);
    expect(component.form.value.firstName).toBe('Jane');
  });

  it('saves changes via the working PATCH-based updateData endpoint', () => {
    component.ngOnInit();

    component.onSubmit();

    expect(dataServiceSpy.updateData).toHaveBeenCalledWith('/users/', 3, component.form.value);
  });
});
