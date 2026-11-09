import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { of } from 'rxjs';
import { Clipboard } from '@angular/cdk/clipboard';
import { ToastrService } from 'ngx-toastr';
import { ApiTokenCardComponent } from './api-token-card.component';
import { ApiTokenService, ApiTokenSummary } from '../../../services/api-token.service';

describe('ApiTokenCardComponent', () => {
    let fixture: ComponentFixture<ApiTokenCardComponent>;
    let component: ApiTokenCardComponent;
    let serviceStub: {
        tokens: ReturnType<typeof signal<ApiTokenSummary[]>>;
        loading: ReturnType<typeof signal<boolean>>;
        createdPlaintext: ReturnType<typeof signal<string | null>>;
        hasToken: () => boolean;
        load: jasmine.Spy;
        create: jasmine.Spy;
        revoke: jasmine.Spy;
        clearPlaintext: jasmine.Spy;
    };
    let clipboard: jasmine.SpyObj<Clipboard>;
    let toastr: jasmine.SpyObj<ToastrService>;

    beforeEach(async () => {
        const tokens = signal<ApiTokenSummary[]>([]);
        const createdPlaintext = signal<string | null>(null);
        serviceStub = {
            tokens,
            loading: signal(false),
            createdPlaintext,
            hasToken: computed(() => tokens().length > 0),
            load: jasmine.createSpy('load').and.returnValue(of([])),
            create: jasmine.createSpy('create').and.callFake((name: string) => {
                createdPlaintext.set('fresh-secret');
                tokens.set([{ id: 1, name, createdAt: '2026-01-01', lastUsedAt: null }]);
                return of({ id: 1, name, token: 'fresh-secret', createdAt: '2026-01-01' });
            }),
            revoke: jasmine.createSpy('revoke').and.callFake(() => {
                tokens.set([]);
                createdPlaintext.set(null);
                return of(undefined);
            }),
            clearPlaintext: jasmine.createSpy('clearPlaintext').and.callFake(() => createdPlaintext.set(null)),
        };
        clipboard = jasmine.createSpyObj('Clipboard', ['copy']);
        toastr = jasmine.createSpyObj('ToastrService', ['success', 'error']);

        await TestBed.configureTestingModule({
            imports: [ApiTokenCardComponent],
            providers: [
                { provide: ApiTokenService, useValue: serviceStub },
                { provide: Clipboard, useValue: clipboard },
                { provide: ToastrService, useValue: toastr },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ApiTokenCardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('loads tokens on init and shows the generate button when none exist', () => {
        expect(serviceStub.load).toHaveBeenCalled();
        const generateBtn: HTMLElement | null = fixture.nativeElement.querySelector('.generate-btn');
        expect(generateBtn).toBeTruthy();
    });

    it('generate() creates a token with the default name', () => {
        component.generate();
        expect(serviceStub.create).toHaveBeenCalledWith('API token');
    });

    it('shows the one-time plaintext after creation', () => {
        component.generate();
        fixture.detectChanges();
        const secretField: HTMLInputElement | null = fixture.nativeElement.querySelector('.token-value');
        expect(secretField).toBeTruthy();
        expect(secretField!.value).toBe('fresh-secret');
    });

    it('copy() copies the plaintext to the clipboard and notifies', () => {
        component.generate();
        component.copy();
        expect(clipboard.copy).toHaveBeenCalledWith('fresh-secret');
        expect(toastr.success).toHaveBeenCalled();
    });

    it('copy() is a no-op when there is no plaintext to copy', () => {
        component.copy();
        expect(clipboard.copy).not.toHaveBeenCalled();
    });

    it('revoke() revokes by id', () => {
        component.revoke(42);
        expect(serviceStub.revoke).toHaveBeenCalledWith(42);
    });
});
