import { Component } from '@angular/core';
@Component({
    selector: 'app-campaign-render',
    //template: `<a [routerLink]="['/campaigns/update/'+params.data.cid]">{{params.value}}</a>`
    template: `<mat-label matTooltip="show creatives list">
        <a [routerLink]="['/campaigns/creatives-list/'+params.data.cid, {campaignName: params.data.name}]">
            {{params.value}}
        </a>
    </mat-label>
        `
})
export class CampaignRenderComponent {
    constructor() {}
    link: string;
    params: any;
    agInit(params: any): void {
        this.params = params;

    }
}
