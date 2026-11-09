import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, tap } from 'rxjs';
import { ConfigurationService } from './ConfigurationService';

export interface ApiTokenSummary {
    id: number;
    name: string;
    createdAt: string;
    lastUsedAt: string | null;
}

export interface ApiTokenCreated {
    id: number;
    name: string;
    token: string;
    createdAt: string;
}

/**
 * Manages the logged-in user's personal API tokens. The backend only ever
 * returns a token's plaintext value once, at creation time (it stores a
 * hash), so `createdPlaintext` holds that value transiently for the UI to
 * show-and-copy, and is cleared as soon as the user is done with it.
 */
@Injectable({ providedIn: 'root' })
export class ApiTokenService {
    private readonly http = inject(HttpClient);
    private readonly config = inject(ConfigurationService);

    readonly tokens = signal<ApiTokenSummary[]>([]);
    readonly loading = signal(false);
    readonly createdPlaintext = signal<string | null>(null);
    readonly hasToken = computed(() => this.tokens().length > 0);

    private baseUrl (): string {
        return this.config.getApiHost() + '/api-tokens';
    }

    load (): Observable<ApiTokenSummary[]> {
        this.loading.set(true);
        return this.http.get<ApiTokenSummary[]>(this.baseUrl()).pipe(
            tap((tokens) => this.tokens.set(tokens ?? [])),
            finalize(() => this.loading.set(false)),
        );
    }

    create (name: string): Observable<ApiTokenCreated> {
        this.loading.set(true);
        return this.http.post<ApiTokenCreated>(this.baseUrl(), { name }).pipe(
            tap((created) => {
                this.createdPlaintext.set(created.token);
                this.tokens.update((list) => [
                    ...list,
                    { id: created.id, name: created.name, createdAt: created.createdAt, lastUsedAt: null },
                ]);
            }),
            finalize(() => this.loading.set(false)),
        );
    }

    revoke (id: number): Observable<void> {
        this.loading.set(true);
        return this.http.delete<void>(`${this.baseUrl()}/${id}`).pipe(
            tap(() => {
                this.tokens.update((list) => list.filter((token) => token.id !== id));
                this.createdPlaintext.set(null);
            }),
            finalize(() => this.loading.set(false)),
        );
    }

    /** Dismiss the one-time plaintext once the user has copied/stored it. */
    clearPlaintext (): void {
        this.createdPlaintext.set(null);
    }
}
