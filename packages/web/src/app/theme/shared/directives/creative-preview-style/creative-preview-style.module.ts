import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {CreativePreviewStyleDirective} from "./creativePreviewStyle.directive";



@NgModule({
  declarations: [CreativePreviewStyleDirective],
  exports: [CreativePreviewStyleDirective],
  imports: [
    CommonModule
  ]
})
export class CreativePreviewStyleModule { }
