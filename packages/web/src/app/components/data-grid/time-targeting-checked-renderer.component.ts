import {Component, EventEmitter, Output} from '@angular/core';
import {DataService} from "../../services/data.service";
import {AgRendererComponent} from "ag-grid-angular";
import {ICellRendererParams} from "ag-grid-community";

@Component({
    selector: 'app-time-targeting-renderer-cell',
    template: `<span>
        <div class="full-width" >
                <mat-checkbox [color]="'primary'" 
                              [(ngModel)]="isChecked"
                              (change)="changeStatus($event)"
                ></mat-checkbox>
            </div>
    </span>`,
})
export class TimeTargetingCheckedRendererComponent implements AgRendererComponent{
    constructor(private dataService: DataService) {}
    visibility = false;
    isChecked: boolean;
    weekDays = {
        'Sunday': 6,
        'Monday': 0,
        'Tuesday': 1,
        'Wednesday': 2,
        'Thursday': 3,
        'Friday': 4,
        'Saturday': 5};
    dayOfWeek: number;
    hour: number;

    public params: ICellRendererParams;

    agInit(params: ICellRendererParams): void {
        this.params = params;
        this.isChecked = this.params.value;
        this.dayOfWeek = this.weekDays[this.params.data.day];
        this.hour = parseInt(this.params.colDef.field);
            this.invokeParentMethod();
    }

    public invokeParentMethod() {
        this.params.context.componentParent.methodFromParent({
            dayOfWeek: this.dayOfWeek,
            hour: this.hour,
            status: this.isChecked})
    }

    refresh(params: ICellRendererParams): boolean {
        return false;
    }
    changeStatus(event){
        this.isChecked = event.checked;
        this.invokeParentMethod();
    }
    // toggleChanges(event){
    //     let isActive = !!event.checked;
    //     this.dataService.updateCampaign(this.params.data.cid, {data: {isActive: isActive}}).subscribe((res) => {
    //     });
    // }
}

