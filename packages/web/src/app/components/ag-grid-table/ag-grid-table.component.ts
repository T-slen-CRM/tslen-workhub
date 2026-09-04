import {
  Component,
  effect,
  input,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';

@Component({
  selector: 'app-ag-grid-table',
  templateUrl: './ag-grid-table.component.html',
  styleUrls: ['./ag-grid-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class AgGridTableComponent {
  @ViewChild('agGrid') agGrid: AgGridAngular;
  columnDefs = input<any>([]);
  components = input<any>();
  rowData = input<any>();
  context = input<any>();
  sizeColumnsToFit = input<boolean>(false);
  headerHeight = input<number>(81);
  rowHeight = input<number>(38);
  tableId = input<string>();
  public defaultColDef: any;

  constructor() {
    this.defaultColDef = {
      resizable: true,
      width: 75,
    };
    effect(() => {
      if (this.sizeColumnsToFit() && this.agGrid) {
        setTimeout(() => {
          this.agGrid.api.sizeColumnsToFit();
        }, 200);
      }
    });
  }

  onGridSizeChanged(): void {
    // The initial fit above runs once, 200ms after the grid is ready - if
    // the host container is still mid-layout at that point (e.g. a
    // sidenav/route transition still animating) the columns get fit to
    // that transient, too-narrow width and are never revisited, leaving a
    // permanent gap. gridSizeChanged fires (via ag-Grid's own
    // ResizeObserver) every time the grid's actual rendered size changes,
    // so re-fitting here corrects that regardless of when layout settles.
    if (this.sizeColumnsToFit() && this.agGrid) {
      this.agGrid.api.sizeColumnsToFit();
    }
  }
}
