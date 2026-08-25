import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ChangeDetectionStrategy, OnInit,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

/**
 * @title Chips Autocomplete
 */
@Component({
  selector: 'app-single-autocomplete',
  templateUrl: './single-autocomplete.component.html',
  styleUrls: ['./single-autocomplete.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class SingleAutocompleteComponent implements OnInit {
  @Output() selectedItemsForParent = new EventEmitter<object>();

  @Input() nameOfList: any;
  @Input() selectedData: any;
  @ViewChild('elementInput') elementInput: ElementRef<HTMLInputElement>;

  public allData = [];
  @Input('allData') set setAllData(value) {
    this.allData = value;
    if (!this.selectedData) {
      this.selectedData = [];
    }
    this.reservedData = this.allData.map((item) => {
      return item;
    });
    this.filteredElement();
  }
  selectable = true;
  removable = true;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  elementCtrl = new FormControl();
  filteredElements: Observable<string[]>;
  reservedData: any;

  constructor() {
    this.filteredElement();
  }

  ngOnInit() {
    this.reservedData = this.allData;
    if (!this.selectedData) {
      this.selectedData = [];
    }
    if (this.selectedData.length > 0) {
      for (let i = 0; i < this.selectedData.length; i++) {
        const selectedEl = this.selectedData[i];
        for (let j = 0; j < this.allData.length; j++) {
          const allDataEl = this.allData[j];
          if (allDataEl.value === selectedEl.value) {
            this.allData.splice(j, 1);
            this.allData = [];
          }
        }
      }

      this.filteredElement();
    }
  }
  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add our fruit
    if (value) {
      this.selectedData.push(value);
    }

    // Clear the input value
    //event.chipInput!.clear();
    event.input.value = '';
    this.elementCtrl.setValue(null);
  }

  remove(el: string): void {
    const index = this.selectedData.indexOf(el);
    if (index >= 0) {
      this.selectedData.splice(index, 1);
      this.allData.push(el);
      this.allData = this.reservedData;
    }
    this.filteredElement();
    this.selectedItemsForParent.emit({
      name: this.nameOfList,
      data: this.selectedData,
    });
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    const value = event.option.value;
    this.selectedData.push(value);
    this.actionAfterSelection(value);
  }

  private _filter(value: any) {
    let filterValue;
    if (typeof value === 'object') {
      filterValue = value.group.toLowerCase();
    } else {
      filterValue = value.toLowerCase();
    }
    return this.allData.filter((item) => {
      return item.group.toLowerCase().includes(filterValue);
    });
  }
  filteredElement() {
    this.filteredElements = this.elementCtrl.valueChanges.pipe(
      startWith(null),
      map((item: string | null) =>
        item ? this._filter(item) : this.allData.slice(),
      ),
    );
  }
  setSelectedData(selectedData) {
    this.selectedData = selectedData;
    this.actionAfterSelection(this.selectedData[0]);
  }

  actionAfterSelection(value) {
    this.elementInput.nativeElement.value = '';
    this.elementCtrl.setValue(null);
    const index = this.allData.indexOf(value);

    if (index >= 0) {
      this.allData = [];
    }
    this.filteredElement();
    this.selectedItemsForParent.emit({
      name: this.nameOfList,
      data: this.selectedData,
    });
  }
}
