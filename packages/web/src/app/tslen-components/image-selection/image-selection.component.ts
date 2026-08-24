import {
  Component,
  Input,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IDaysOffObject } from '../../interfaces/dashboard';
import { MatIconModule } from '@angular/material/icon';
import { LibsService } from '../../services/libs.service';
import { MatChipsModule } from '@angular/material/chips';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { MediaMatcher } from '@angular/cdk/layout';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-image-selection',
  imports: [
    CommonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './image-selection.component.html',
  styleUrls: ['./image-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: ImageSelectionComponent,
    },
    {
      provide: NG_VALIDATORS,
      multi: true,
      useExisting: ImageSelectionComponent,
    },
  ],
})
export class ImageSelectionComponent
  implements ControlValueAccessor, Validator
{
  public logoArr: any;
  public logoObject: any;
  public iconsListByRequestTypes: object;
  public touched = false;
  public disabled = false;
  public selectedType: string;
  public mediaQueryMatch: any;

  // @Input() public set daysOffList(data: IDaysOffObject){
  //   this.incomingDaysOffItems = data;
  // }
  // @Input() disabledChips: boolean;
  constructor(
    private libsService: LibsService,
    private mediaMatcher: MediaMatcher,
  ) {
    this.logoObject = {
      not_interested: {
        icon: 'not_interested',
        color: '#000',
        title: 'No image',
      },
      android: { icon: 'android', color: '#87cc56', title: 'Android' },
      build: { icon: 'build', color: '#e25a5a', title: 'Build' },
      dashboard: { icon: 'dashboard', color: '#fe8940', title: 'Dashboard' },
      devices: { icon: 'devices', color: '#43cccd', title: 'Device' },
      cloud: { icon: 'cloud', color: '#a8d3fa', title: 'Cloud' },
    };
    this.logoArr = Object.keys(this.logoObject);
    this.mediaQueryMatch =
      mediaMatcher.matchMedia('(min-width: 750px)').matches;
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
  changeSelectedType(value) {
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
    return null;
  }
}
