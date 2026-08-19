import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicBindDirective } from './dynamic-bind.directive';



@NgModule({
  declarations: [
    DynamicBindDirective,

  ],
  exports: [
    DynamicBindDirective
  ],
  imports: [
    CommonModule
  ]
})
export class BindElementModule { }
