import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-date-time-input',
  imports: [],
  templateUrl: './date-time-input.component.html',
  styleUrl: './date-time-input.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: DateTimeInputComponent,
    },
  ],
})
export class DateTimeInputComponent implements ControlValueAccessor {
  @Input() public label: string;
  @Input() public type: string;

  public touched = false;
  public disabled = false;
  public currentValue: any;

  onChange = (currentValue) => {};
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

  writeValue(currentValue: string): void {
    this.currentValue = currentValue;
  }
  changeCurrentValue(event) {
    this.currentValue = event.target.value;
    this.onChange(this.currentValue);
    this.markAsTouched();
  }
  markAsTouched() {
    if (!this.touched) {
      this.onTouched();
      this.touched = true;
    }
  }
}
