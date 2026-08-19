import { Component } from '@angular/core';
import {DataService} from "../../services/data.service";
import {log} from "util";

@Component({
    selector: 'app-audience-list-actions-renderer',
    template: `<span>
        <div class="full-width" >
                <button  mat-icon-button
                         color="primary"
                         matTooltip="Edit filter list"
                         matTooltipPosition="above"
                         aria-label="edit"
                         [routerLink]="['/audience-manager/audience-update/'+id]"
                ><i class="fa fa-edit"></i>
                    <!--            <mat-icon >edit</mat-icon>-->
          </button>
            <button  mat-icon-button
                     color="primary"
                     matTooltip="Delete filter list"
                     matTooltipPosition="above"
                     aria-label="edit"
                     (click)="onDelete(id)">
                <i class="fa fa-trash"></i>
                <!--            <mat-icon >edit</mat-icon>-->
          </button>
            </div>
    </span>`,
})
export class AudienceListActionsRendererComponent {
    constructor(
        private dataService: DataService
    ) {}
    params: any;
    visibility = false;
    isChecked = false;
    id: number;
    gridApi: any;
    // color = 'warn';

    agInit(params: any): void {
        this.params = params;
        this.id = params.data.id;
        this.gridApi = params.api;
    }
    onDelete(id) {
        let check = confirm('Do you want to delete selected filter list ?');
        if (check){
            this.dataService.deleteAudience(id).subscribe(res => {
                window.location.reload()
            })

        }
        return false
    }
}

