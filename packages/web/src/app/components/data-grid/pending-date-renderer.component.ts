import { Component } from '@angular/core';

@Component({
    selector: 'app-pending-date-renderer',
    template: `<span >{{params.value | date:'medium'}}</span>`,
    standalone: false
})
export class PendingDateRendererComponent {
    params: any;
    agInit(params: any): void {
        this.params = params;
    }
}

