import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiTokenService } from './api-token.service';
import { ConfigurationService } from './ConfigurationService';

describe('ApiTokenService', () => {
    let service: ApiTokenService;
    let httpMock: HttpTestingController;
    const base = 'http://api.test/api/v1/api-tokens';

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                ApiTokenService,
                {
                    provide: ConfigurationService,
                    useValue: { getApiHost: () => 'http://api.test/api/v1' },
                },
            ],
        });
        service = TestBed.inject(ApiTokenService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('load() populates tokens and hasToken reflects it', () => {
        expect(service.hasToken()).toBe(false);
        service.load().subscribe();
        const req = httpMock.expectOne(base);
        expect(req.request.method).toBe('GET');
        req.flush([{ id: 7, name: 'API token', createdAt: '2026-01-01', lastUsedAt: null }]);

        expect(service.hasToken()).toBe(true);
        expect(service.tokens().length).toBe(1);
        expect(service.loading()).toBe(false);
    });

    it('create() exposes the one-time plaintext and adds a summary', () => {
        service.create('API token').subscribe();
        const req = httpMock.expectOne(base);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ name: 'API token' });
        req.flush({ id: 9, name: 'API token', token: 'plence-secret-123', createdAt: '2026-02-02' });

        expect(service.createdPlaintext()).toBe('plence-secret-123');
        expect(service.hasToken()).toBe(true);
        expect(service.tokens()[0].id).toBe(9);
    });

    it('revoke() removes the token and clears any shown plaintext', () => {
        service.create('API token').subscribe();
        httpMock.expectOne(base).flush({ id: 9, name: 'API token', token: 'secret', createdAt: '2026-02-02' });
        expect(service.hasToken()).toBe(true);

        service.revoke(9).subscribe();
        const req = httpMock.expectOne(`${base}/9`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);

        expect(service.hasToken()).toBe(false);
        expect(service.createdPlaintext()).toBeNull();
    });
});
