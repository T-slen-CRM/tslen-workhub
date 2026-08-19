import {Component} from '@angular/core';
import {ILoadingCellRendererAngularComp} from "ag-grid-angular";
import {ILoadingCellRendererParams} from "ag-grid-community";

@Component({
    selector: 'app-loading-cell-renderer',
    template: `
     <div class="ag-custom-loading-cell" style="padding-left: 10px; line-height: 25px;">
       <i class="fas fa-spinner fa-pulse"></i>
       <span> {{ params.loadingMessage }} </span>
     </div>
   `,
    standalone: false
})
export class AgGridLoading implements ILoadingCellRendererAngularComp {
    public params: ILoadingCellRendererParams & { loadingMessage: string };

    agInit(params: ILoadingCellRendererParams & { loadingMessage: string }): void {
        this.params = params;
    }
}
