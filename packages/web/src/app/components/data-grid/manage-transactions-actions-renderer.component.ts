import { Component } from '@angular/core';
import {DataService} from "../../services/data.service";
import {PendingService} from "../../services/pending.service";

@Component({
    selector: 'app-pending-actions-renderer',
    template: `<span *ngIf="showActions">
        <div class="full-width" >
                <button  mat-icon-button
                         color="primary"
                         matTooltip="Approve"
                         matTooltipPosition="above"
                         aria-label="Approve"
                         (click)="onApprove()"
                         [class.spinner]="loading"
                         [disabled]="loading"
                ><i class="fa fa-check icon"></i>
          </button>
            <button  mat-icon-button
                     color="primary"
                     matTooltip="Edit"
                     matTooltipPosition="above"
                     aria-label="edit"
                     [routerLink]="['/admin/manage-transactions-update/'+id]"
                     >
                <i class="fas fa-edit icon"></i>
          </button>
            <button  mat-icon-button
                     color="primary"
                     matTooltip="Disapprove"
                     matTooltipPosition="above"
                     aria-label="cancel"
                     (click)="onDisapprove()"
                     [class.spinner]="loadingDisapprove"
                     [disabled]="loadingDisapprove"
            >
                <i class="fas fa-times icon"></i>
          </button>
            </div>
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
        }
    `]
})
export class ManageTransactionsActionsRendererComponent {
    constructor(
        private dataService: DataService
    ) {}
    params: any;
    id: number;
    gridApi: any;
    loading: boolean;
    loadingDisapprove: boolean;
    showActions: boolean;
    balance: string;
    userId: number;
    // color = 'warn';

    agInit(params: any): void {
        this.params = params;
        this.id = params.data.id;
        this.showActions = params.data.status === 'Pending';
        this.balance = this.params.data.balance;
        this.userId = this.params.data.userId;
        this.gridApi = params.api;
    }
    onApprove() {
        this.loading = true;
        this.dataService.updateTransaction(this.id,
            {data: {id:this.id, status: 0, balance: this.balance, userId: this.userId}})
            .subscribe((res) => {
            this.loading = false;
                this.params.data.status = 'Completed';
                this.showActions = false;
                this.params.api.refreshCells();
        });
    }
    onDisapprove() {
        let check = confirm('Do you want to disapprove selected transactions ?');
        if (check){
            this.loadingDisapprove = true;
            this.dataService.updateTransaction(this.id,
                {data: {id:this.id, status: 0, balance: '0', userId: this.userId, isDeleted: 1}})
                .subscribe((res) => {
                    this.loadingDisapprove = false;
                    //this.params.data.status = 'Completed';
                    this.showActions = false;
                    this.removeAgGridRow();
                    //this.params.api.refreshCells();
                });
        }
        return false
    }
    removeAgGridRow(){
        let selectedNode = this.params.node;
        let selectedData = selectedNode.data;
        this.params.api.updateRowData({remove: [selectedData]});

    }
}

