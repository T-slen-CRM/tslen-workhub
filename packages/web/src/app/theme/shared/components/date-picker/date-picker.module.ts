import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
// import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import {DatePickerComponent} from './date-picker.component';
import {CommonModule} from "@angular/common";
import {MatButtonModule} from "@angular/material/button";

@NgModule({
    imports: [FormsModule, CommonModule, MatButtonModule],
  declarations: [DatePickerComponent],
  exports: [DatePickerComponent],
  bootstrap: [DatePickerComponent]
})
export class DatePickerModule {}
