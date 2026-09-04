import { TestBed } from '@angular/core/testing';
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
});
