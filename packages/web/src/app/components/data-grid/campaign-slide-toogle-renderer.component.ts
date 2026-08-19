import { Component } from '@angular/core';
import {DataService} from "../../services/data.service";
import {AgRendererComponent} from "ag-grid-angular";
import {ICellRendererParams} from "ag-grid-community";
import {log} from "util";
import {ngxLoadingAnimationTypes} from "ngx-loading";

@Component({
    selector: 'app-slide-toogle-renderer-cell',
    template: `<span>
        <div class="full-width" >
                <mat-slide-toggle
                        [checked] = isChecked
                        (change)="toggleChanges($event)"
                        [disabled]="disabled"
                        matTooltip="{{params.data.status}}"
                        color = "primary"
                >
                </mat-slide-toggle>
            </div>
 
    <ngx-loading [show]="loading" [config]="ngxConfig" ></ngx-loading>
    </span>`,
    styles: [`
        .mat-slide-toggle {
           transform: scale(0.9);
            
        }
        .full-width{
            display: flex;
            justify-content: center;
        }
        @keyframes spinner {
            to {transform: rotate(360deg);}
        }

        .spinner:before {
            content: '';
            box-sizing: border-box;
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            margin-top: -10px;
            margin-left: -10px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            border-top-color: #4051b5;
            animation: spinner .8s linear infinite;
        }
    `]
})
export class CampaignSlideToogleRendererComponent implements AgRendererComponent{
    constructor(
        private dataService: DataService
    ) {}
    public params: ICellRendererParams;
    visibility = false;
    isChecked = false;
    disabled: boolean;
    loading: boolean;
    ngxConfig = {
        animationType: ngxLoadingAnimationTypes.pulse,
        //backdropBackgroundColour: 'rgba(0,0,0,0.1)',
        backdropBorderRadius: '4px',
        primaryColour: '#4680ff',
        secondaryColour: '#f1c50d',
        tertiaryColour: '#4680ff'
    }
    // color = 'warn';

    agInit(params: ICellRendererParams): void {
        this.params = params;
        if (params.value !== undefined
            && params.value !== 0 && params.value !== -1) {
            // this.visibility = true;
                this.isChecked = true;
        }
        if ((!this.isChecked && this.params.data.status !== 'Turned off')
            || params.value === -1){
            this.disabled = true;
        }
    }
    toggleChanges(event){
        this.loading = true;
        let isActive = !!event.checked;
        if (!isActive && this.params.data.status !== 'Turned off' && this.params.data.status !== 'Running'){
            this.disabled = true;
        }
            this.dataService.updateCampaign(this.params.data.cid, {data: {id:this.params.data.cid, isActive: isActive}}).subscribe((res) => {

                if (!isActive){
                    this.params.data.status = this.params.data.status !== 'Running' ? this.params.data.status : 'Turned off';
                } else {
                    this.params.data.status = this.params.data.status !== 'Turned off' ? this.params.data.status : 'Running';
                }
                //this.params.data.status = !isActive && this.params.data.status !== 'Running' ? this.params.data.status : 'Turned off';
                this.params.api.refreshCells();
                this.loading = false;
                this.invokeParentMethod();
            });

    }

    refresh(params: ICellRendererParams): boolean {
        return false;
    }

    public invokeParentMethod() {
        this.params.context.campaignListComponent.refreshCampaignListByActiveToggle()
    }
}

