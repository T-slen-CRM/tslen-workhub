import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AuthSigninComponent } from './auth-signin.component';
import { AuthenticationService } from '../../../services/auth.service';
import { ConfigurationService } from '../../../services/ConfigurationService';
import { LanguageService } from '../../../language/language.service';

describe('AuthSigninComponent', () => {
  let component: AuthSigninComponent;
  let fixture: ComponentFixture<AuthSigninComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthenticationService>;
  let routerStub: { url: string; navigate: jasmine.Spy };

  beforeEach(async () => {
    sessionStorage.removeItem('postLoginRedirect');
    authServiceSpy = jasmine.createSpyObj('AuthenticationService', ['login']);
    authServiceSpy.isGoogleLogged$ = new BehaviorSubject<boolean>(false);
    routerStub = { url: '/auth/login', navigate: jasmine.createSpy('navigate') };
    const languageServiceSpy = jasmine.createSpyObj('LanguageService', ['setDefaultLangFromBrowser', 'changeLangBrowser', 'get']);
    languageServiceSpy.get.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      declarations: [AuthSigninComponent],
      providers: [
        { provide: AuthenticationService, useValue: authServiceSpy },
        { provide: Router, useValue: routerStub },
        { provide: ConfigurationService, useValue: { getApiHost: () => '' } },
        { provide: LanguageService, useValue: languageServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthSigninComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    sessionStorage.removeItem('postLoginRedirect');
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('isLoggedIn');
  });

  describe('password login', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.loginForm.patchValue({ email: 'ada@example.com', password: 'secret' });
    });

    it('goes to the main wall when there is no pending meet link', () => {
      authServiceSpy.login.and.returnValue(of({ body: { accessToken: 'jwt' }, status: 200 }) as never);

      component.login();

      expect(routerStub.navigate).toHaveBeenCalledWith(['/pages/main-wall']);
    });

    it('returns to the meet link the visitor came from, then forgets it', () => {
      sessionStorage.setItem('postLoginRedirect', '/meet/plain-token');
      authServiceSpy.login.and.returnValue(of({ body: { accessToken: 'jwt' }, status: 200 }) as never);

      component.login();

      expect(routerStub.navigate).toHaveBeenCalledWith(['/meet/plain-token']);
      expect(sessionStorage.getItem('postLoginRedirect')).toBeNull();
    });
  });

  describe('OAuth redirect callback', () => {
    it('returns to the meet link the visitor came from, then forgets it', () => {
      sessionStorage.setItem('postLoginRedirect', '/meet/plain-token');
      routerStub.url = '/auth/login?token=oauth-jwt';

      component.ngOnInit();

      expect(routerStub.navigate).toHaveBeenCalledWith(['/meet/plain-token']);
      expect(sessionStorage.getItem('postLoginRedirect')).toBeNull();
    });

    it('goes to the main wall when there is no pending meet link', () => {
      routerStub.url = '/auth/login?token=oauth-jwt';

      component.ngOnInit();

      expect(routerStub.navigate).toHaveBeenCalledWith(['/pages/main-wall']);
    });
  });
});
