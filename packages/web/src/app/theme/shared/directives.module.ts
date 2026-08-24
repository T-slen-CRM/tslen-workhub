import { NgModule } from '@angular/core';
import {PreventDefaultDirective} from './directives/prevent-default.directive';

@NgModule({
  exports: [
    PreventDefaultDirective
  ],
  declarations: [
    PreventDefaultDirective
  ],
})
export class DirectivesModule { }
