import { Component } from '@angular/core';
import {MatDialog} from "@angular/material/dialog";
import {CampaignSupplyModalComponent} from "../campaign-supply-modal/campaign-supply-modal.component";

@Component({
    selector: 'app-supply-renderer-cell',
    template: `
        <span>
            <button mat-icon-button 
                    (click)="openCampaignSupply(campaignId, campaignName)">
                <mat-icon style="color: #4051b5">sync</mat-icon>
            </button>
        </span>
    `
})
export class CampaignSupplyRendererComponent {

    constructor(public dialog: MatDialog) {

    }
    campaignId: number;
    campaignName: string;
    params: any;
    agInit(params: any): void {
        this.params = params;
        this.campaignId = this.params.data.cid;
        this.campaignName = this.params.data.name;
        if (this.params.value && this.params.value.length > 0) {
        }
    }
    openCampaignSupply(campaignId, campaignName):void {
            const dialogRef = this.dialog.open(CampaignSupplyModalComponent, {
                width: '50%',
                position:{ top: '10%', left: '30%' },
                data: {campaignId, campaignName}
            });
        }

}
