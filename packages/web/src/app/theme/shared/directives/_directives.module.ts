import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {IncrementCounterDirective} from "./IncrementCounterDirective";
import {StyleCounterDirective} from "./styleCounter.derective";



@NgModule({
  declarations: [
      IncrementCounterDirective,
      StyleCounterDirective
  ],
  exports: [
      IncrementCounterDirective,
      StyleCounterDirective
  ],
  imports: [
    CommonModule
  ]
})
export class _directivesModule { }
