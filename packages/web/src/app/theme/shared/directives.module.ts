import { NgModule } from '@angular/core';
import {PreventDefaultDirective} from './directives/prevent-default.directive';
import {ExportDirective} from "./directives/export.directive";

@NgModule({
  exports: [
    PreventDefaultDirective,
    ExportDirective
  ],
  declarations: [
    PreventDefaultDirective,
    ExportDirective
  ],
})
export class DirectivesModule { }
