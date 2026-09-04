import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { of, Subject } from 'rxjs';
import { UserProfileComponent } from './user-profile.component';
import { DataService } from '../../../services/data.service';
import { AuthenticationService } from '../../../services/auth.service';
import { LanguageService } from '../../../language/language.service';

describe('UserProfileComponent', () => {
  let component: UserProfileComponent;
  let dataService: jasmine.SpyObj<DataService>;

  function build (routerUrl: string) {
    dataService = jasmine.createSpyObj('DataService', ['getObservableData']);
    dataService.getObservableData.and.returnValue(of({}));
    const authService = {
      authDataSignal: () => ({ id: 1, role: 'admin', companyId: 4, googlePermissions: {} }),
    } as unknown as AuthenticationService;
    const router = { url: routerUrl } as unknown as Router;
    const translateService = {
      get: () => of({}),
      onLangChange: new Subject(),
    } as unknown as LanguageService;

    component = new UserProfileComponent(
      new FormBuilder(),
      dataService as unknown as DataService,
      {} as MatDialog,
      {} as ToastrService,
      authService,
      router,
      translateService,
    );
  }

  it("fetches from '/users/lookup' rather than the heavy '/users' list, for editing an existing user", () => {
    build('/pages/user-profile/3');

    component.ngOnInit();

    expect(dataService.getObservableData).toHaveBeenCalledWith('/users/lookup');
    expect(dataService.getObservableData).not.toHaveBeenCalledWith('/users');
  });

  it("fetches from '/users/lookup' when setting up a new user too", () => {
    build('/pages/user-profile/new');

    component.ngOnInit();

    expect(dataService.getObservableData).toHaveBeenCalledWith('/users/lookup');
  });

  it('sets isLoading while editing an existing user\'s data is in flight and clears it once it settles', () => {
    build('/pages/user-profile/3');
    const userSubject = new Subject<unknown>();
    const groupsSubject = new Subject<unknown>();
    const jobPositionSubject = new Subject<unknown>();
    const lookupSubject = new Subject<unknown>();
    dataService.getObservableData.and.callFake((path: string) => {
      if (path === '/users/3') return userSubject.asObservable();
      if (path === '/groups') return groupsSubject.asObservable();
      if (path === '/users/lookup') return lookupSubject.asObservable();
      if (path === '/job-position') return jobPositionSubject.asObservable();
      return of({});
    });

    component.ngOnInit();
    expect(component.isLoading()).toBe(true);

    userSubject.next({ id: 3, userRelationToGroups: [], userChiefRelations: [] });
    groupsSubject.next([]);
    lookupSubject.next([]);
    jobPositionSubject.next([]);
    userSubject.complete();
    groupsSubject.complete();
    lookupSubject.complete();
    jobPositionSubject.complete();

    expect(component.isLoading()).toBe(false);
  });

  it('sets isLoading while a new user\'s setup data is in flight and clears it once it settles', () => {
    build('/pages/user-profile/new');
    const dataSubject = new Subject<unknown>();
    dataService.getObservableData.and.returnValue(dataSubject.asObservable());

    component.ngOnInit();
    expect(component.isLoading()).toBe(true);

    dataSubject.next([]);
    dataSubject.complete();

    expect(component.isLoading()).toBe(false);
  });
});
