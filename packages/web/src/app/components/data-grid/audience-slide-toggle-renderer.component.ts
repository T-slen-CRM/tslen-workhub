import { Component } from '@angular/core';
import {DataService} from "../../services/data.service";

@Component({
    selector: 'app-autorules-slide-toggle-renderer-cell',
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
export class AudienceSlideToggleRendererComponent {
    constructor(
        private dataService: DataService
    ) {}
    params: any;
    visibility = false;
    isChecked = false;

    agInit(params: any): void {
        this.params = params;
        if (params.value !== undefined
            && params.value !== 0) {
                this.isChecked = true;
        }
    }
    toggleChanges(event){
        let isActive = !!event.checked;
        this.dataService.updateAudience(this.params.data.id, {data: {isActive: isActive}}).subscribe((res) => {
        });
    }
}

