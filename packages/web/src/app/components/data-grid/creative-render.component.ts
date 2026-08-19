import { Component } from '@angular/core';
import {Router} from "@angular/router";
@Component({
    selector: 'app-campaign-render',
    template: `<a [routerLink]="['/creatives/creative-update/'+params.data.crid,
                            {creativeName: params.data.name,
                             campaignId: campaignId, 
                             campaignName: campaignName }]"
                  matTooltip="Edit creative"
                  matTooltipPosition="after"
                  
    >{{params.value}}</a>`
})
export class CreativeRenderComponent {
    constructor(
        private router: Router
    ) {}
    link: string;
    params: any;
    campaignId: number;
    campaignName: string;
    agInit(params: any): void {
        this.campaignId = parseInt(this.router.url.split('/').pop(), 10);
        this.campaignName = this.router.url.split('=')[1];
        this.params = params;

    }
}
