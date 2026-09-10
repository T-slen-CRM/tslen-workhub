import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ICellRendererParams } from 'ag-grid-community';

import { UserNameCellRendererComponent } from './user-name-cell-renderer.component';
import { UserCardInfoComponent } from '../../pages/users/user-card-info/user-card-info.component';

describe('UserNameCellRendererComponent', () => {
  let component: UserNameCellRendererComponent;
  let fixture: ComponentFixture<UserNameCellRendererComponent>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  const mockedParams = {
    data: { id: 7, firstName: 'Jane', lastName: 'Doe' },
  } as unknown as ICellRendererParams;

  beforeEach(() => {
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      declarations: [UserNameCellRendererComponent],
      providers: [{ provide: MatDialog, useValue: dialogSpy }],
    });

    fixture = TestBed.createComponent(UserNameCellRendererComponent);
    component = fixture.componentInstance;
  });

  it('reads the id and full name from the ag-Grid row params', () => {
    component.agInit(mockedParams);

    expect(component.id).toBe(7);
    expect(component.name).toBe('Jane Doe');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Jane Doe');
  });

  it('opens the user-card-info dialog for that id, instead of navigating to a route', () => {
    component.agInit(mockedParams);

    component.openUserCard();

    expect(dialogSpy.open).toHaveBeenCalledWith(UserCardInfoComponent, {
      width: '480px',
      data: { id: 7 },
    });
  });
});
