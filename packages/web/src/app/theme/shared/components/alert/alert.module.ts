import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AlertComponent } from './alert.component';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule
  ],
  declarations: [AlertComponent],
  exports: [AlertComponent]
})
export class AlertModule { }
