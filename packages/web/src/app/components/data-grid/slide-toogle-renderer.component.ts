import { Component } from '@angular/core';

@Component({
    selector: 'app-slide-toogle-renderer-cell',
    template: `<span>
        <div class="full-width" >
                <mat-slide-toggle
                        [checked] = isChecked
                        (change)="toggleChanges($event)"
                        color = "primary">
                </mat-slide-toggle>
            </div>
    </span>`,
})
export class SlideToogleRendererComponent {
    constructor() {}
    params: any;
    visibility = false;
    isChecked = false;
    // color = 'warn';

    agInit(params: any): void {
        if (params.value !== undefined
            && params.value !== 0) {
            // this.visibility = true;
                this.isChecked = true;
            this.params = params;
        }
    }
    toggleChanges(event){
    }
}

