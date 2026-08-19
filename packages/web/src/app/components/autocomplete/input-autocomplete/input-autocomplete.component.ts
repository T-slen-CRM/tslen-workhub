import { Component, Input, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor, NgModel } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Observable } from 'rxjs';
//import 'rxjs/add/operator/toPromise';

@Component({
  selector: 'app-input-autocomplete',
  templateUrl: './input-autocomplete.component.html',
  styleUrls: ['./input-autocomplete.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => InputAutocompleteComponent),
    multi: true
  }]
})
export class InputAutocompleteComponent implements ControlValueAccessor {

  @Input() placeholder: string;
  @Input() autocomplete: any;
  @Input() set value(value: string) {
    this.innerValue = value == null ? '' : String(value);
  }
  get value() {
    return this.innerValue;
  }

  autocompleteChoices: any;

  private changeCallback: Function;
  private touchedCallback: Function;

  isDisabled = false;
  innerValue = '';

  displayText(value: any): string {
    return value.text;
  }

  writeValue(value: any) {
    if (!this.autocomplete) {
      this.value = value;
    }
  }
  registerOnChange(fn: Function) {
    this.changeCallback = fn;
  }
  registerOnTouched(fn: Function) {
    this.touchedCallback = fn;
  }
  setDisabledState(isDisabled: boolean) {
    this.isDisabled = isDisabled;
  }

  inputHandler(event: Event) {
    this.value = (<HTMLInputElement>event.target).value;
    if (this.changeCallback) {
      this.changeCallback(this.value);
    }
  }

  autocompleteHandler(event: Event) {
    const text = (<HTMLInputElement>event.target).value;
    if (this.autocomplete) {
      if (text) {
        this.autocompleteChoices = this.autocomplete(text);
      } else if (this.changeCallback) {
        this.innerValue = '';
        this.changeCallback(null);
      }
    }
  }

  autocompleteBlur(event: Event) {
    (<HTMLInputElement>event.target).value = this.innerValue;
    this.setTouched();
  }

  updateOption(event: MatAutocompleteSelectedEvent) {
    if (this.changeCallback) {
      const { value, text } = event.option.value;
      this.value = text;
      this.changeCallback(value);
    }
  }

  setTouched() {
    if (this.touchedCallback) {
      this.touchedCallback();
    }
  }

}
