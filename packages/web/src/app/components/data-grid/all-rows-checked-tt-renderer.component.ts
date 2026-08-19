import {Component, EventEmitter, Output} from '@angular/core';
import {DataService} from "../../services/data.service";
import {AgRendererComponent} from "ag-grid-angular";
import {ICellRendererParams} from "ag-grid-community";

@Component({
    selector: 'app-all-rows-checked-renderer-cell',
    template: `<span>
        <div class="full-width" >
<!--                <mat-checkbox-->
<!--                         style="margin-right: 5px"-->
<!--                         [color]="'primary'"-->
<!--                         (change)="changeStatus($event)"-->
<!--                ></mat-checkbox>-->
            <span matTooltip="Select all row"
                  matTooltipPosition="above"
                  class="day-select"
                  (click)="changeStatus()"
            >{{value}}</span>
            </div>
        
    </span>`,
    styles: [`
        .day-select:hover {
            color: #4051b5;
        }
    `]
})
export class AllRowsCheckedTtRendererComponent implements AgRendererComponent{
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
    field: string;
    value: string;
    selectedAllRows: boolean;
    selectedAllRowElements: any;

    public params: ICellRendererParams;

    agInit(params: ICellRendererParams): void {
        this.params = params;
        this.value = this.params.value;
        this.dayOfWeek = this.weekDays[this.params.data.day];
        this.hour = parseInt(this.params.colDef.field);
        this.selectedAllRows = this.params.data.selectedAllRowElements;
        // if (this.isChecked){
        //     this.invokeParentMethod();
        // }

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
    changeStatus(){
        const rowIndex =  this.params.rowIndex;
        let oldData= this.params.data;
        this.selectedAllRows = !this.params.data.selectedAllRowElements;
        this.params.context.componentParent.onSelectAllRow({oldData, rowIndex, isChecked: this.selectedAllRows})

    }
}

