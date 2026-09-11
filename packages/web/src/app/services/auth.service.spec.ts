import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthenticationService } from './auth.service';
import { ConfigurationService } from './ConfigurationService';

describe('AuthenticationService', () => {
  let service: AuthenticationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: ConfigurationService, useValue: { getApiHost: () => 'http://localhost' } },
      ],
    });
    service = TestBed.inject(AuthenticationService);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('jwtToken', 'stale-jwt');
  });

  afterEach(() => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('jwtToken');
  });

  it('logout clears the JWT and the isLoggedIn flag', () => {
    service.updateAuthDataSignal({ id: 7, firstName: 'Ada' } as never);

    service.logout();

    expect(localStorage.getItem('isLoggedIn')).toBe('false');
    expect(localStorage.getItem('jwtToken')).toBeNull();
  });

  it('logout also clears authDataSignal, so a stale identity is never read as still logged in - the SPA singleton survives a client-side navigation (e.g. straight to a guest meeting link) without a full page reload to reset it', () => {
    service.updateAuthDataSignal({ id: 7, firstName: 'Ada' } as never);
    expect(service.authDataSignal().id).toBe(7);

    service.logout();

    expect(service.authDataSignal().id).toBeUndefined();
  });
});
