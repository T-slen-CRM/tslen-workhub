import {
  ElementRef,
  HostBinding,
  Component,
  OnInit,
  ViewChild,
  forwardRef,
  Input,
  Optional,
  Self,
  ChangeDetectorRef,
  Output, EventEmitter
} from '@angular/core';
import { NgControl, FormControl, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { Subject, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatAutocompleteTrigger} from '@angular/material/autocomplete';
import { MatFormFieldControl} from '@angular/material/form-field';
import { FocusMonitor } from '@angular/cdk/a11y';

// export class ItemList {
//   constructor(public item: string, public selected?: boolean) {
//     if (selected === undefined) this.selected = false;
//   }
// }

@Component({
  selector: 'multiselect-autocomplete-example',
  templateUrl: 'multiselect-autocomplete-example.component.html',
  styleUrls: ['multiselect-autocomplete-example.component.scss'],
  providers: [{ provide: MatFormFieldControl, useExisting: MultiselectAutocompleteExample }]
})
export class MultiselectAutocompleteExample implements OnInit {
  @Output() selectedItemsForParent: EventEmitter<object> = new EventEmitter();
  @ViewChild('inputTrigger', { read: MatAutocompleteTrigger }) inputTrigger: MatAutocompleteTrigger;
  itemControl = new FormControl();
  stateChanges = new Subject<void>();
  private _placeholder: string;
  static nextId = 0;
  @HostBinding() id = `input-ac-${MultiselectAutocompleteExample.nextId++}`;
  @HostBinding('attr.aria-describedby') describedBy = '';
  setDescribedByIds(ids: string[]) {
    this.describedBy = ids.join(' ');
  }
  @Input() set value(value: any) {
    if ( value ){
      this.selectedItems = value;
    }
    this.stateChanges.next();
  }
  get value() {
    return this.selectedItems;
  }
  @Input()
  get placeholder() {
    return this._placeholder;
  }
  set placeholder(plh) {
    this._placeholder = plh;
    this.stateChanges.next();
  }
  private changeCallback: any;
  private touchedCallback: Function;
  focused = false;
  isAllSelected = false;

  items = [
      { group: 'IAB1 Arts & Entertainment', value: 'IAB1'},
    { group: 'IAB2 Automotive', value: 'IAB2'},
    { group: 'IAB3 Business', value: 'IAB3'},
    { group: 'IAB4 Careers', value: 'IAB4'},
    { group: 'IAB5 Education', value: 'IAB5'},
    { group: 'IAB6 Family & Parenting', value: 'IAB6'},
    { group: 'IAB7 Health & Fitness', value: 'IAB7'},
    { group: 'IAB8 Food & Drink', value: 'IAB8'},
    { group: 'IAB9 Hobbies & Interests', value: 'IAB9'},
  ]
  selectedItems: any = [];
  filteredItems: any;
  // filteredItems: Observable<ItemList[]>;

  constructor(
      @Optional() @Self() public ngControl: NgControl,
      private fm: FocusMonitor,
      private elRef: ElementRef<HTMLElement>,
      private cd: ChangeDetectorRef
  ) {
    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }
    fm.monitor(elRef.nativeElement, true).subscribe(origin => {
      this.focused = !!origin;
      this.stateChanges.next();
    });
  }

  writeValue(value: any) {
  }
  registerOnChange(fn: Function) {
    this.changeCallback = fn;
  }
  registerOnTouched(fn: Function) {
    this.touchedCallback = fn;
  }

  lastFilter = '';

  ngOnInit() {
    this.itemControl.valueChanges.pipe(
        startWith<string | []>(''),
        map(value => typeof value === 'string' ? value : this.lastFilter),
        map(filter => this.filter(filter))
    ).subscribe(data => this.filteredItems = data);

  }
  clicker() {
    this.inputTrigger.openPanel();
  }
  filter(filter: string): any {
    this.lastFilter = filter;
    if (filter) {
      return this.items.filter(option => {
        return option.group.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
      })
    } else {
      return this.items.slice();
    }
  }

  optionClicked(event: Event, item: any) {
    event.stopPropagation();
    this.toggleSelection(item);
  }

  toggleSelectAll(){
    this.isAllSelected = !this.isAllSelected;
    let len = this.filteredItems.length;
    if ( this.isAllSelected ){
      for ( let i=0; i++; i<len )
        this.filteredItems[i].selected = true;
      // this.selectedItems = data;
      this.selectedItems = this.filteredItems;
      // for ( let i=0; i++; i<len )
      //   this.items[i].selected = true;
      // this.filteredItems. = [...this.items];
      //this.changeCallback( this.selectedItems );
      this.cd.markForCheck();
      // this.itemControl.updateValueAndValidity();
    } else {
      this.selectedItems = [];
      // for ( let i=0; i++; i<len )
      // this.items[i].selected = false;

    }
    //this.changeCallback( this.selectedItems );
  }
  toggleSelection(item: any) {
    item.selected = !item.selected;
    if (item.selected) {
      this.selectedItems.push(item);
      //this.changeCallback( this.selectedItems );
    } else {
      const i = this.selectedItems.findIndex(value => value.item === item.item );
      this.selectedItems.splice(i, 1);
      //this.changeCallback( this.selectedItems );
    }
    this.selectedItemsForParent.emit(this.selectedItems);

  }

  ngOnDestroy() {
    this.fm.stopMonitoring(this.elRef.nativeElement);
    this.stateChanges.complete();
  }

  readonly autofilled: boolean;
  readonly controlType: string;
  readonly disabled: boolean;
  readonly empty: boolean;
  readonly errorState: boolean;

  onContainerClick(event: MouseEvent): void {
  }

  readonly required: boolean;
  readonly shouldLabelFloat: boolean;
  readonly userAriaDescribedBy: string;

}
