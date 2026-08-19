import { Component } from '@angular/core';
import {DataService} from "../../services/data.service";

@Component({
    selector: 'app-manage-ssp-actions-renderer',
    template: `<span>
        <div class="full-width" >
            <button  mat-icon-button
                     color="primary"
                     matTooltip="Edit"
                     matTooltipPosition="above"
                     aria-label="edit"
                     [routerLink]="['/admin/manage-ssp-update/'+id]"
                     >
                <i class="fas fa-edit icon"></i>
          </button>
             <button  mat-icon-button
                      color="primary"
                      matTooltip="Delete"
                      matTooltipPosition="above"
                      aria-label="cancel"
                      (click)="onDelete()"
             >
                <i class="fas fa-times icon"></i>
          </button>
            </div>
    </span>`,
    styles: [`
        .icon {
            font-size: 16px;
        }

    `]
})
export class ManageSspActionsRendererComponent {
    constructor(
        private dataService: DataService
    ) {}
    params: any;
    id: number;
    gridApi: any;

    agInit(params: any): void {
        this.params = params;
        this.id = params.data.id;
        this.gridApi = params.api;
    }
    onDelete() {
        let check = confirm('Do you want to delete selected ssp?');
        if (check){
            this.dataService.deleteSsp(this.id)
                .subscribe((res) => {
                    if (res && res['error']){
                        alert(res['error'].message)
                    } else {
                        this.removeAgGridRow();
                    }
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

