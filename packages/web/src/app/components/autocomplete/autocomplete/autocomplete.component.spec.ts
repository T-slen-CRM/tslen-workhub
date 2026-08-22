import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AutocompleteComponent } from './autocomplete.component';

describe('AutocompleteComponent', () => {
  let component: AutocompleteComponent;
  let fixture: ComponentFixture<AutocompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AutocompleteComponent],
      imports: [
        ReactiveFormsModule, MatFormFieldModule, MatChipsModule,
        MatAutocompleteModule, MatIconModule, TranslateModule.forRoot(),
        NoopAnimationsModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AutocompleteComponent);
    component = fixture.componentInstance;
    component.nameOfList = 'Assignee';
    component.selectedData = [{ value: 1, group: 'Jane Doe' }];
    fixture.detectChanges();
  });

  it('keeps the label visible once a value is selected, instead of removing it from the DOM', () => {
    const label = fixture.debugElement.query(By.css('mat-label'));

    expect(label).not.toBeNull();
    expect(label.nativeElement.textContent.trim()).toBe('Assignee');
  });

  it('floats the label to the top of the outline once a value is selected, instead of overlapping the chip', () => {
    // Regression: mat-chip-grid content-queries for MatChipRow, not the
    // generic MatChip - rendering plain <mat-chip> elements inside it
    // means _chips.length stays 0, so the field never thinks it's
    // non-empty and the label never floats, no matter how many chips
    // are visibly selected.
    const floatingLabel = fixture.nativeElement.querySelector('.mdc-floating-label');

    expect(floatingLabel.classList).toContain('mdc-floating-label--float-above');
  });
});
