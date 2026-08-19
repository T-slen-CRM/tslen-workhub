import {Component, Input, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {IDaysOffObject} from '../../interfaces/dashboard';
import {MatIconModule} from '@angular/material/icon';
import {LibsService} from '../../services/libs.service';
import {MatChipsModule} from '@angular/material/chips';
import {AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator} from '@angular/forms';
import {MediaMatcher} from '@angular/cdk/layout';
import {MatSelectModule} from '@angular/material/select';
import {MatButtonModule} from '@angular/material/button';
import {MatTooltipModule} from "@angular/material/tooltip";

@Component({
    selector: 'app-days-off-items',
    imports: [CommonModule, MatIconModule, MatChipsModule, MatSelectModule, MatButtonModule, MatTooltipModule],
    templateUrl: './days-off-items.component.html',
    styleUrls: ['./days-off-items.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            multi: true,
            useExisting: DaysOffItemsComponent
        },
        {
            provide: NG_VALIDATORS,
            multi: true,
            useExisting: DaysOffItemsComponent
        }
    ]
})
export class DaysOffItemsComponent implements ControlValueAccessor, Validator {
  public incomingDaysOffItems: IDaysOffObject;
  public keysDayOff: string[];
  public iconsListByRequestTypes: object;
  public touched = false;
  public disabled = false;
  public selectedType: string;
  public mediaQueryMatch: any;


  @Input() public set daysOffList(data: IDaysOffObject){
    this.incomingDaysOffItems = data;
  }
  @Input() disabledChips: boolean;
  constructor(private libsService: LibsService,
              private mediaMatcher: MediaMatcher) {
    this.iconsListByRequestTypes = this.libsService.daysOffList;
    this.keysDayOff = Object.keys(this.iconsListByRequestTypes);
    this.mediaQueryMatch = mediaMatcher.matchMedia('(min-width: 750px)').matches;
  }
  onChange = (selectedType) => {};
  registerOnChange(onChange: any): void {
    this.onChange = onChange;
  }
  onTouched = () => {};
  registerOnTouched(onTouched: any) {
    this.onTouched = onTouched;
  }

  setDisabledState(disabled: boolean) {
    this.disabled = disabled;
  }

  writeValue(selectedType: string): void {
    this.selectedType = selectedType;
  }
  changeSelectedType(value){
    this.selectedType = value;
    this.onChange(this.selectedType);
    this.markAsTouched();
  }
  markAsTouched() {
    if (!this.touched) {
      this.onTouched();
      this.touched = true;
    }
  }
  validate(control: AbstractControl): ValidationErrors | null {
    const requestType = control.value;
    if (this.incomingDaysOffItems && typeof this.incomingDaysOffItems[requestType] !== 'undefined'
        && this.incomingDaysOffItems[requestType] === 0) {
      return {
        positiveTotal: true
      };
    }
  }

}
