import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AgGridTableComponent } from './ag-grid-table.component';

describe('AgGridTableComponent', () => {
  function build (sizeColumnsToFit: boolean) {
    TestBed.configureTestingModule({
      declarations: [AgGridTableComponent],
      schemas: [NO_ERRORS_SCHEMA],
    });
    const fixture = TestBed.createComponent(AgGridTableComponent);
    fixture.componentRef.setInput('sizeColumnsToFit', sizeColumnsToFit);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it("re-fits columns whenever the grid reports its own size changed, not just once at init - a column layout computed against the container's transient (e.g. mid-transition) width never gets corrected otherwise", () => {
    const component = build(true);
    const sizeColumnsToFitSpy = jest.fn();
    (component as unknown as { agGrid: unknown }).agGrid = { api: { sizeColumnsToFit: sizeColumnsToFitSpy } };

    component.onGridSizeChanged();

    expect(sizeColumnsToFitSpy).toHaveBeenCalled();
  });

  it('does not force-fit columns on a size change when sizeColumnsToFit is off', () => {
    const component = build(false);
    const sizeColumnsToFitSpy = jest.fn();
    (component as unknown as { agGrid: unknown }).agGrid = { api: { sizeColumnsToFit: sizeColumnsToFitSpy } };

    component.onGridSizeChanged();

    expect(sizeColumnsToFitSpy).not.toHaveBeenCalled();
  });

  describe('rowHeight/headerHeight inputs', () => {
    // The template hardcoded [rowHeight]="38" and [headerHeight]="81"
    // instead of binding to these signal inputs, so every consumer passing
    // a custom value (audit-log/inventory pass rowHeight=43/headerHeight=50)
    // had it silently ignored.
    it('passes a custom rowHeight through to the underlying grid', () => {
      TestBed.configureTestingModule({
        declarations: [AgGridTableComponent],
        schemas: [NO_ERRORS_SCHEMA],
      });
      const fixture = TestBed.createComponent(AgGridTableComponent);
      fixture.componentRef.setInput('rowHeight', 43);
      fixture.detectChanges();

      const grid = fixture.debugElement.query(By.css('ag-grid-angular'));

      expect((grid.nativeElement as { rowHeight?: number }).rowHeight).toBe(43);
    });

    it('passes a custom headerHeight through to the underlying grid', () => {
      TestBed.configureTestingModule({
        declarations: [AgGridTableComponent],
        schemas: [NO_ERRORS_SCHEMA],
      });
      const fixture = TestBed.createComponent(AgGridTableComponent);
      fixture.componentRef.setInput('headerHeight', 50);
      fixture.detectChanges();

      const grid = fixture.debugElement.query(By.css('ag-grid-angular'));

      expect((grid.nativeElement as { headerHeight?: number }).headerHeight).toBe(50);
    });
  });
});
