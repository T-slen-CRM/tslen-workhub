import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {FormControl} from '@angular/forms';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {MatChipInputEvent} from '@angular/material/chips';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';

/**
 * @title Chips Autocomplete
 */
@Component({
    selector: 'app-autocomplete',
    templateUrl: './autocomplete.component.html',
    styleUrls: ['./autocomplete.component.scss'],
    standalone: false
})
export class AutocompleteComponent {
  public allData = [];
  @Output() selectedItemsForParent: EventEmitter<{name: string, data: any[]}> = new EventEmitter();
  @Input('allData') set setAllData(value) {
    this.allData = value ? value : [];
    if (!this.selectedData){
      this.selectedData = [];
    }
    //make object from entries
    const selectedEntries = Object.fromEntries(this.selectedData.map((item: any) => [item.value, item]));
    this.renewData = this.allData.reduce((acc: any, cur: any) => {
      // exclude selected data
      if (!selectedEntries[cur.value]){
        acc.push(cur);
      }
      return acc;
    }, []);
    this.filteredElement();

  }
  @Input() nameOfList: any;
  @Input() shownLabel: string;
  @Input() showResetBtn: boolean;
  @Input() selectedData: any;
  @ViewChild('elementInput') elementInput: ElementRef<HTMLInputElement>;
  selectable = true;
  removable = true;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  elementCtrl = new FormControl();
  filteredElements: Observable<string[]>;
  renewData: any;

  constructor() {
    this.filteredElement();
  }

  ngOnInit(){
    if (!this.selectedData){
      this.selectedData = [];
    }
    this.renewData = this.allData.map(item => {return item;});
    if (this.selectedData.length > 0){
      for (let i=0; i<this.selectedData.length; i++){
        let selectedEl = this.selectedData[i];
        for (let j=0; j<this.renewData.length; j++){
          let allDataEl = this.renewData[j];
          if (allDataEl.value === selectedEl.value){
            this.renewData.splice(j,1);
          }
        }
      }

      this.filteredElement();
    }
  }
  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    if (value && typeof value === 'string') {
      this.selectedData.push({group: value, value: value});
    }
    // Add our option
    // if (value) {
    //   this.selectedData.push(value);
    // }

    // Clear the input value
    //event.chipInput!.clear();
    event.input.value = '';

    this.elementCtrl.setValue(null);
    this.selectedItemsForParent.emit({name: this.nameOfList, data: this.selectedData});
  }

  remove(el: string): void {
    const index = this.selectedData.indexOf(el);

    if (index >= 0) {
      this.selectedData.splice(index, 1);
      this.renewData.push(el);
    }
    this.filteredElement();
    this.selectedItemsForParent.emit({name: this.nameOfList, data: this.selectedData});
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.selectedData.push(event.option.value);
    this.elementInput.nativeElement.value = '';
    this.elementCtrl.setValue(null);
    const index = this.renewData.indexOf(event.option.value);


    if (index >= 0) {
      this.renewData.splice(index, 1);
    }
    this.filteredElement();
    this.selectedItemsForParent.emit({name: this.nameOfList, data: this.selectedData});
  }

  private _filter(value: any) {
    let filterValue;
    if (typeof value === 'object'){
      filterValue = value.group.toLowerCase();
    } else {
      filterValue = value.toLowerCase();
    }
    return this.renewData.filter(item => {
      return item.group.toLowerCase().includes(filterValue);
    });
  }
  filteredElement(){
    this.filteredElements = this.elementCtrl.valueChanges.pipe(
        startWith(null),
        map((item: string | null) => item ? this._filter(item) : this.renewData.slice()));
  }

  resetSelectedData(){
    this.selectedData = [];
    this.renewData = this.allData.map(item => {return item;});
    this.filteredElement();
    this.selectedItemsForParent.emit({name: this.nameOfList, data: this.selectedData});
  }
}
