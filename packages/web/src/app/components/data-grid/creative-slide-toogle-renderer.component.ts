import { Component } from '@angular/core';
import {DataService} from "../../services/data.service";
import {style} from "@angular/animations";

@Component({
    selector: 'app-slide-toogle-renderer-cell',
    template: `<span>
        <div class="{{class}}">
                <mat-slide-toggle matTooltip="{{toolTip}}"
                                  [checked] = isChecked
                                  (change)="toggleChanges($event)"
                                  color="{{color}}"
                                  [disabled]=disabled
                >
                </mat-slide-toggle>
            </div>
    </span>`,
    styles: [`
        :host ::ng-deep .pending-creative .mat-slide-toggle.mat-checked:not(.mat-disabled) .mat-slide-toggle-bar {
            background-color: #FFE4B5 ;
        }

        :host ::ng-deep .pending-creative .mat-slide-toggle.mat-checked:not(.mat-disabled) .mat-slide-toggle-thumb {
            background-color: #f1c50d  ;
        }
        .mat-slide-toggle {
            transform: scale(0.9);

        }
    `]
})
export class CreativeSlideToogleRendererComponent {
    constructor(
        private dataService: DataService
    ) {}
    params: any;
    visibility = false;
    isChecked = false;
    color = 'primary';
    class = 'approved-creative';
    toolTip = '';
    disabled: boolean;

    agInit(params: any): void {
        this.params = params;
        if (params.value !== undefined
            && params.value !== 0
            && params.value !== -1) {
            // this.visibility = true;
                this.isChecked = true;
            if (this.isChecked && this.params.data.approved === 'pending'){
                this.class = 'pending-creative';
                this.toolTip = 'waiting for approve';
            } else if (this.isChecked && this.params.data.approved === 'disapproved'){
                this.color = 'accent';
                this.toolTip = 'disapproved';
            }
        }
        if (params.value === -1){
            this.disabled = true;
        }
    }
    toggleChanges(event){
        let isActive = !!event.checked;
        if (isActive && this.params.data.approved === 'pending'){
            this.class = 'pending-creative';
            this.toolTip = 'waiting for approve';
        } else if (isActive && this.params.data.approved === 'disapproved'){
            this.color = 'accent';
            this.toolTip = 'disapproved';
        }
        this.dataService.updateCreative(this.params.data.crid, {data: {id:this.params.data.crid, isActive: isActive}}).subscribe((res) => {
        });
    }
}

