import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { UserCardInfoComponent } from './user-card-info.component';
import { DataService } from '../../../services/data.service';
import { UserGeneralData } from '../../../interfaces/userConfig';

describe('UserCardInfoComponent', () => {
  let fixture: ComponentFixture<UserCardInfoComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;

  const mockedUser: UserGeneralData = {
    id: 5,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    avatar: 'https://example.com/avatar.jpg',
    birthDay: '1990-05-12',
    country: '',
    phone: '0931865176',
    skype: null,
    address: 'makarova str',
    jobPosition: '1',
    jobPositionDetails: { id: 1, title: 'Engineer' },
    companyId: 1,
    company: 'Acme',
    isActive: 1,
    role: 'admin',
    managerId: null,
    chiefId: null,
    useDarkTheme: 0,
    loginCount: 0,
    lastLogin: null,
    firstDayInCompany: '2020-04-01',
    lastDayInCompany: null,
    emailSpare: null,
    daysOff: {},
    eventsByUsers: {},
    eventsByUsersRequest: {},
    userChiefRelations: {},
    userRelationToGroups: {},
    googleCalendars: null,
    group: null,
    value: 0,
    userProbation: null,
  } as unknown as UserGeneralData;

  function createComponent(response$: Observable<unknown>): void {
    dataServiceSpy = jasmine.createSpyObj('DataService', ['getObservableData']);
    dataServiceSpy.getObservableData.and.returnValue(response$);

    TestBed.configureTestingModule({
      imports: [UserCardInfoComponent, TranslateModule.forRoot()],
      providers: [{ provide: DataService, useValue: dataServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(UserCardInfoComponent);
    fixture.componentRef.setInput('id', 5);
    fixture.detectChanges();
  }

  it('fetches the user by the routed id', () => {
    createComponent(of(mockedUser));

    expect(dataServiceSpy.getObservableData).toHaveBeenCalledWith('/users/5');
  });

  it('renders the general info as plain read-only text, never as editable form controls', () => {
    createComponent(of(mockedUser));

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Jane Doe');
    expect(text).toContain('jane.doe@example.com');
    expect(text).toContain('0931865176');
    expect(text).toContain('makarova str');
    expect(text).toContain('Engineer');

    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    expect(fixture.nativeElement.querySelector('mat-form-field')).toBeNull();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('does not show the company or role - not useful info for this quick-view card', () => {
    createComponent(of(mockedUser));

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('Acme');
    expect(text).not.toContain('admin');
  });

  it('falls back to a "not specified" label for missing optional fields', () => {
    createComponent(of({ ...mockedUser, phone: null, address: null }));

    const text = fixture.nativeElement.textContent;
    // No translation loader in this test setup - the pipe renders the raw
    // key, which is fine here since the point under test is that a
    // fallback renders at all (twice) instead of an empty/"null" row.
    expect(text.match(/user_card_info\.not_specified/g)?.length).toBe(2);
  });

  it('shows a "no user found" message when the user stream emits nothing truthy', () => {
    createComponent(of(null));

    expect(fixture.nativeElement.textContent).toContain('user_card_info.no_user_found');
  });
});
