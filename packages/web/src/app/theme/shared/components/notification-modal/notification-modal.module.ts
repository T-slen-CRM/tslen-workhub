import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationModalComponent } from './notification-modal-component/notification-modal.component';
import {MatButtonModule} from "@angular/material/button";
import {MatDialogModule} from "@angular/material/dialog";
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [
    NotificationModalComponent
  ],
  imports: [
      CommonModule,
      MatButtonModule,
      MatDialogModule,
      TranslateModule
  ],
  exports: []
})
export class NotificationModalModule { }
