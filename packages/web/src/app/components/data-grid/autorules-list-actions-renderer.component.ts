import { Component } from '@angular/core';
import {DataService} from "../../services/data.service";
import {DeleteConfirmModalComponent} from "../delete-confirm-modal/delete-confirm-modal.component";
import {Subscription} from "rxjs";
import {MatDialog} from "@angular/material/dialog";
import {ToastrService} from "ngx-toastr";

@Component({
    selector: 'app-autorules-list-actions-renderer',
    template: `<span>
        <div class="full-width" [class.spinner]="loading">
                <button  mat-icon-button
                         color="primary"
                         matTooltip="Edit"
                         matTooltipPosition="above"
                         aria-label="edit"
                         [routerLink]="['/autorules/autorules-update/'+id]"
                         [disabled]="loading"
                    ><i class="fa fa-edit"></i>
                    <!--            <mat-icon >edit</mat-icon>-->
                </button>
                <button  mat-icon-button
                         color="primary"
                         matTooltip="Delete"
                         matTooltipPosition="above"
                         aria-label="edit"
                         (click)="onDelete(id)"
                         [disabled]="loading"
                >
                    <i class="fa fa-trash"></i>
                <!--<mat-icon>edit</mat-icon>-->
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
export class AutorulesListActionsRendererComponent {
    params: any;
    visibility = false;
    isChecked = false;
    id: number;
    gridApi: any;
    loading = false;
    subscriptions: Subscription;
    constructor(
        public dialog: MatDialog,
        private dataService: DataService,
        public toastr: ToastrService
    ) {
        this.subscriptions = new Subscription();
    }
    // color = 'warn';

    agInit(params: any): void {
        this.params = params;
        this.id = params.data.id;
        this.gridApi = params.api;
    }
    onDelete(id) {
        const dialogRef = this.dialog.open(DeleteConfirmModalComponent);
        dialogRef.afterClosed().subscribe(result => {
            if (result){
                this.loading = true;
                const deleteMedia: Subscription = this.dataService.deleteAutorules(id).subscribe(res => {
                    this.loading = false;
                    this.toastr.success('Item has been deleted successfully', 'Deleted');
                    this.removeAgGridRow();
                })
                this.subscriptions.add(deleteMedia);
            }

        });
    }
    removeAgGridRow(){
        let selectedNode = this.params.node;
        let selectedData = selectedNode.data;
        this.params.api.updateRowData({remove: [selectedData]});
        this.loading = false;
    }
}

