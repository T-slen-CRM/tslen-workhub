import { Component } from '@angular/core';
import {FolderCreateModalComponent} from "../folder-create-modal/folder-create-modal.component";
import {MatDialog} from "@angular/material/dialog";
import {FiltersListModalComponent} from "../filters-list-modal/filters-list-modal.component";
// import { RightRoundService } from '../core/services/right-round.service';

@Component({
    selector: 'app-filter-list-renderer-cell',
    template: `
        <span>
            
            <button mat-icon-button 
                    (click)="openFiltersSettings(campaignId, selectedValue,
                                                    filterList, isInclude, listId)"
                    matTooltip="select filter list"
            >
<!--                <mat-icon style="color: #4051b5">settings</mat-icon>-->
<!--                <mat-icon [style]="iconColor">settings</mat-icon>-->
                <mat-icon [ngClass]="selectedValue ? 'mat-primary' : ''">settings</mat-icon>
            </button>
            <mat-label>{{this.blackOrWhite}} {{selectedValue}}</mat-label>
        </span>
    `
})
export class CampaignFilterListsRendererComponent {

    constructor(public dialog: MatDialog) {

    }
    campaignId: number;
    listId: number;
    params: any;
    selectedValue = '';
    filterList = [];
    isInclude: number;
    blackOrWhite: string;
    iconColor: string;

    agInit(params: any): void {
        this.params = params;
        this.campaignId = this.params.data.cid;
        if (this.params.value && this.params.value.length > 0) {
            if (this.params.value[0]){
                this.isInclude = this.params.value[0][0].isInclude;
                this.listId = this.params.value[0][0].id;
                this.selectedValue = this.params.value[0][0].title;
                if (this.isInclude === 1){
                    this.blackOrWhite = 'WL:'
                } else if (this.isInclude === 0){
                    this.blackOrWhite = 'BL:'
                }
            }
            if (this.selectedValue){
                this.iconColor = "color: #4051b5";
            }
            this.filterList = this.params.value[1];
        }
    }
    openFiltersSettings(campaignId,selectedValue, filterLists, isInclude, listId):void {
            const dialogRef = this.dialog.open(FiltersListModalComponent, {
                width: '50%',
                position:{ top: '10%', left: '30%' },
                data: {campaignId, selectedValue, filterLists, isInclude, listId}
            });
        }

}
