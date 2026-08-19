import { Component } from '@angular/core';
import {log} from "util";
//import { PinnedColumnService } from '../core/services/pinned-column.service';

@Component({
    selector: 'app-header-settings-renderer-cell',
    template: `
            <span matTooltip="select all column"
                  (click)="changeStatus()"
                  class="day-select"
            >{{params.displayName}}</span>
  `,
    styles: [`
        .day-select:hover {
            color: #4051b5;
        }
    `
    ],
    animations: []
})
export class HeaderTimetargetingCellRenderer {

    public params: any;
    isChecked: boolean;
    field: number;
    constructor() {
    }

    agInit(params): void {
        this.params = params;
        this.field = this.params.column.colDef.field;

    }
    changeStatus(){
        this.invokeParentMethod();
    }
    public invokeParentMethod() {
        this.params.context.componentParent.onSelectAllColumn(this.field)
    }
}
