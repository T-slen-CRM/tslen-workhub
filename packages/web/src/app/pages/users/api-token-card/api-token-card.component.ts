import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Clipboard } from '@angular/cdk/clipboard';
import { ToastrService } from 'ngx-toastr';
import { LoadingButtonComponent } from '../../../helpers/loading-button/loading-button.component';
import { ApiTokenService } from '../../../services/api-token.service';

/**
 * Self-contained card for managing the logged-in user's personal API token.
 * - No token yet: offers to generate one.
 * - Just generated: shows the plaintext value once, with a copy button.
 * - Token exists: shows its metadata and lets the user revoke it (revoke
 *   then generate again to roll a new value, since the old plaintext can
 *   never be retrieved).
 */
@Component({
    selector: 'app-api-token-card',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, LoadingButtonComponent],
    templateUrl: './api-token-card.component.html',
    styleUrls: ['./api-token-card.component.scss'],
})
export class ApiTokenCardComponent implements OnInit {
    protected readonly service = inject(ApiTokenService);
    private readonly clipboard = inject(Clipboard);
    private readonly toastr = inject(ToastrService);

    /** The backend requires a name; a single personal token needs no UI for it. */
    private readonly defaultName = 'API token';

    ngOnInit (): void {
        this.service.load().subscribe({
            error: () => this.toastr.error('Could not load API tokens'),
        });
    }

    generate (): void {
        this.service.create(this.defaultName).subscribe({
            error: () => this.toastr.error('Could not create API token'),
        });
    }

    copy (): void {
        const token = this.service.createdPlaintext();
        if (!token) {
            return;
        }
        this.clipboard.copy(token);
        this.toastr.success('API token copied to clipboard');
    }

    done (): void {
        this.service.clearPlaintext();
    }

    revoke (id: number): void {
        this.service.revoke(id).subscribe({
            error: () => this.toastr.error('Could not revoke API token'),
        });
    }
}
