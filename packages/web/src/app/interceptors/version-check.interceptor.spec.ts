import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { VersionCheckInterceptor } from './version-check.interceptor';
import { AppVersionService } from '../services/app-version.service';

describe('VersionCheckInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let appVersionServiceSpy: jasmine.SpyObj<AppVersionService>;

  beforeEach(() => {
    appVersionServiceSpy = jasmine.createSpyObj('AppVersionService', ['checkVersion']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AppVersionService, useValue: appVersionServiceSpy },
        { provide: HTTP_INTERCEPTORS, useClass: VersionCheckInterceptor, multi: true },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('reads the X-App-Version response header off a successful response and forwards it to AppVersionService', () => {
    http.get('/api/v1/whatever').subscribe();

    const req = httpMock.expectOne('/api/v1/whatever');
    req.flush({}, { headers: { 'X-App-Version': 'abc123' } });

    expect(appVersionServiceSpy.checkVersion).toHaveBeenCalledWith('abc123');
  });

  it('does not blow up on a request with no X-App-Version header', () => {
    http.get('/api/v1/whatever').subscribe();

    const req = httpMock.expectOne('/api/v1/whatever');
    req.flush({});

    expect(appVersionServiceSpy.checkVersion).toHaveBeenCalledWith(null);
  });
});
