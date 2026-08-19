import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { SingleAutocompleteComponent } from './single-autocomplete.component';

describe('SingleAutocompleteComponent', () => {
  let fixture: ComponentFixture<SingleAutocompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SingleAutocompleteComponent],
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatChipsModule,
        MatAutocompleteModule,
        MatFormFieldModule,
        MatIconModule,
        TranslateModule.forRoot(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SingleAutocompleteComponent);
    fixture.componentInstance.allData = [];
  });

  it('compiles its template without a JIT parse error', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
  });
});
