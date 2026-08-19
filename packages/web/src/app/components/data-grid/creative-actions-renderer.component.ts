import { Component } from '@angular/core';
import {DataService} from "../../services/data.service";
import {MatDialog} from "@angular/material/dialog";
import {ICellRendererParams} from "ag-grid-community";
import {Subscription} from "rxjs";
import {CreativeDuplicateModalComponent} from "../creative-duplicate-modal/creative-duplicate-modal.component";
import {Router} from "@angular/router";

@Component({
    selector: 'app-creative-actions-renderer',
    template: `
        <span>
            <div  class="full-width">
                 <button *ngIf="!isArchive"  mat-icon-button
                         color="primary"
                         matTooltip="Duplicate"
                         matTooltipPosition="above"
                         aria-label="Duplicate"
                         (click)="onDuplicate()"
                         [class.spinner]="loading"
                         [disabled]="loading"
                 ><i class="fa fa-copy"></i>
                          </button>
                <button *ngIf="!isArchive" mat-icon-button
                        color="primary"
                        matTooltip="Archive"
                        matTooltipPosition="above"
                        aria-label="cancel"
                        (click)="OnArchive()"
                        [class.spinner]="loadingArchive"
                        [disabled]="loadingArchive"
                >
                    <i class="fas fa-archive"></i>
              </button>
                <button *ngIf="isArchive" mat-icon-button
                        color="primary"
                        matTooltip="Unarchived"
                        matTooltipPosition="above"
                        aria-label="cancel"
                        (click)="OnUnarchived()"
                        [class.spinner]="loadingArchive"
                        [disabled]="loadingArchive"
                >
                    <i class="fas fa-box-open"></i>
              </button>
                <button *ngIf="isArchive" mat-icon-button
                        color="primary"
                        matTooltip="Delete"
                        matTooltipPosition="above"
                        aria-label="cancel"
                        (click)="OnDelete()"
                        [class.spinner]="loading"
                        [disabled]="loading"
                >
                    <i class="fas fa-times"></i>
              </button>
            </div>
        </span>`,
    styles: [`            

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
export class CreativeActionsRendererComponent {
    public params: ICellRendererParams;
    visibility = false;
    isChecked = false;
    id: number;
    campaignId: number;
    gridApi: any;
    loading: boolean;
    loadingArchive: boolean;
    isArchive: boolean;
    subscriptions: Subscription;

    constructor(
        private dataService: DataService,
        public dialog: MatDialog,
        private router: Router
    ) {
        this.subscriptions = new Subscription();
    }

    agInit(params: ICellRendererParams): void {

        this.params = params;
        this.campaignId = parseInt(this.router.url.split('/').pop(), 10);
        this.id = params.data.crid;
        const isActive = params.data.isActive;
        this.gridApi = params.api;
        if (isActive === -1){
            this.isArchive = true;
        }
    }
    OnArchive() {
        let check = confirm('Do you want to archive selected creative?');
        if (check){
            this.loadingArchive = true;
            this.updateCreative(-1);
        }
        return false
    }
    OnUnarchived() {
        let check = confirm('Do you want to unarchived selected creative?');
        if (check){
            this.loadingArchive = true;
            this.updateCreative(0)
        }
        return false
    }
    OnDelete() {
        let check = confirm('Do you want to unarchived selected creative?');
        if (check){
            this.loading = true;
            this.updateCreative(-2)
        }
        return false
    }

    onDuplicate(){
            const dialogRef = this.dialog.open(CreativeDuplicateModalComponent, {
                width: '60%',
                position: {},
                data: {id: this.id, campaignId: this.campaignId}
            });
        dialogRef.afterClosed().subscribe(result => {
            if (result){
                    this.invokeParentMethod();
            }
        });
    }

    removeAgGridRow(){
        let selectedNode = this.params.node;
        let selectedData = selectedNode.data;
        this.params.api.updateRowData({remove: [selectedData]});
        this.loadingArchive = false;
    }

    public invokeParentMethod() {
        this.params.context.creativesListComponent.refreshCreativesListByChild();
    }
    refresh(params: ICellRendererParams): boolean {
        return false;
    }
    updateCreative(isActive: number){
       const changeActiveStatus: Subscription =  this.dataService.updateCreative(this.id, {data: {id:this.id, isActive: isActive}})
           .subscribe((res) => {
            this.removeAgGridRow();
            this.invokeParentMethod();
            this.loading = false;
            this.loadingArchive = false;
        });
       this.subscriptions.add(changeActiveStatus);
    }
    ngOnDestroy(){
        this.subscriptions.unsubscribe();
    }
}

