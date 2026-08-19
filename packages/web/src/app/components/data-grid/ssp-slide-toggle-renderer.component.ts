import { Component } from '@angular/core';
import {DataService} from "../../services/data.service";
import {AgRendererComponent} from "ag-grid-angular";
import {ICellRendererParams} from "ag-grid-community";
import {log} from "util";
import {Subscription} from "rxjs";

@Component({
    selector: 'app-ssp-slide-toggle-renderer-cell',
    template: `<span>
        <div class="full-width" >
                <mat-slide-toggle
                        [checked] = isChecked
                        (change)="toggleChanges($event)"
                        [disabled]="disabled"
                        matTooltip="{{params.data.status}}"
                        color = "primary">
                </mat-slide-toggle>
            </div>
    </span>`,
    styles: [`
        .mat-slide-toggle {
           transform: scale(0.9);
            
        }
        .full-width{
            display: flex;
            justify-content: center;
        }
    `]
})
export class SspSlideToggleRendererComponent implements AgRendererComponent{
    constructor(
        private dataService: DataService
    ) {}
    public params: ICellRendererParams;
    visibility = false;
    isChecked = false;
    disabled: boolean;
    id: number;
    // color = 'warn';

    agInit(params: ICellRendererParams): void {
        this.params = params;
        this.id = params.data.id;
        if (params.value !== undefined
            && params.value !== 0) {
                this.isChecked = true;
        }
    }
    toggleChanges(event){
        let isActive = !!event.checked;
        this.dataService.saveSSP({data:{id: this.id, isActive: isActive}}, this.id).subscribe(response =>{
        })
    }

    refresh(params: ICellRendererParams): boolean {
        return false;
    }

}

