import { Component } from '@angular/core';
import {DataService} from "../../services/data.service";

@Component({
    selector: 'app-manage-users-actions-renderer',
    template: `<span>
        <div class="manage-users-actions-renderer" >
                <button  mat-icon-button
                         color="primary"
                         matTooltip="Edit user settings"
                         matTooltipPosition="above"
                         aria-label="edit"
                         [routerLink]="['/pages/user-profile/'+id]"
                ><i class="fa fa-edit icon"></i>
          </button>
            </div>
    </span>`,
    styles: [`
        .manage-users-actions-renderer{
            display: flex;
            justify-content: space-evenly;
            align-items: center;
            .icon {
                font-size: 16px;
            }
        }
    `],
    standalone: false
})
export class ManageUsersActionsRendererComponent {
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

