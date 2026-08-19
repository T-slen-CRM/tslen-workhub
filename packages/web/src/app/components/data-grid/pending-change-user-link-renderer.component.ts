import { Component } from '@angular/core';

@Component({
    selector: 'app-pending-campaign-link-renderer',
    template: `<span>
       <mat-label matTooltip="go to campaign">
        <a [routerLink]="['/admin/manage-users']"
           style="color: royalblue">
            {{params.value}}
        </a>
    </mat-label>
    </span>`,
    standalone: false
})
export class PendingChangeUserLinkRendererComponent {
    constructor(
    ) {}
    params: any;

    agInit(params: any): void {
        this.params = params
    }
}

