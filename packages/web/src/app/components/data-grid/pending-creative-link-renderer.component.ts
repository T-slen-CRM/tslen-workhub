import { Component } from '@angular/core';
import {DataService} from "../../services/data.service";
import {ToastrService} from "ngx-toastr";
import {Router} from "@angular/router";
import {UserService} from "../../services/user.service";

@Component({
    selector: 'app-pending-campaign-link-renderer',
    template: `<span>
       <mat-label matTooltip="go to edit creative">
        <a
           style="color: royalblue; cursor: pointer;"
           (click)="changeUser()"
           [class.spinner]="loading">
            {{params.value}}
        </a>
    </mat-label>
    </span>`,
    styles: [`
        .icon {
            font-size: 16px;
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
            cursor: pointer;
        }
    `],
    standalone: false
})
export class PendingCreativeLinkRendererComponent {
    constructor(
        private dataService: DataService,
        private toastr: ToastrService,
        private router: Router,
        private userService: UserService
    ) {}
    params: any;
    id: number;
    campaignId: number;
    campaignName: string;
    creativeName: string;
    userId: number;
    currentUserId: number;
    loading: boolean;
    // color = 'warn';

    agInit(params: any): void {
        this.params = params;
        this.id = params.data.id;
        this.campaignId = params.data.campaignId;
        this.campaignName = params.data.campName;
        this.creativeName = params.data.creativeName;
        this.userId = params.data.userId;
        this.userService.userId.subscribe(id => {
            if (id){
                this.currentUserId = id
            }
        });
    }
    changeUser(){
        if (this.currentUserId !== this.userId){
            this.loading = true;
            this.dataService.changeUser({data: {userId: this.userId}}).subscribe(response => {
                if (response.status === 200){
                    this.userService.setUserFirstName(response.body['firstName']) ;
                    this.userService.setUserLastName(response.body['lastName']);
                    this.userService.setUserId(response.body['id']);
                    this.toastr.success('Current user has been changed', 'Changed');
                    this.loading = false;
                    this.router.navigate(['/creatives/creative-update/'+this.id,
                        {creativeName: this.creativeName, campaignId: this.campaignId, campaignName: this.campaignName}])                } else {
                    this.toastr.warning('Something went wrong', 'Alert');
                    this.loading = false;
                }
            })
        } else {
            this.router.navigate(['/creatives/creative-update/'+this.id,
                {creativeName: this.creativeName, campaignId: this.campaignId, campaignName: this.campaignName}])
        }
    }
}

