import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationFormComponent } from './notification-form/notification-form.component';
import {CardModule} from "..";
import {MatButtonModule} from "@angular/material/button";
import {MatFormFieldModule} from "@angular/material/form-field";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatInputModule} from "@angular/material/input";
import { TranslateModule } from '@ngx-translate/core';



@NgModule({
    declarations: [
        NotificationFormComponent
    ],
    exports: [
        NotificationFormComponent
    ],
    imports: [
        CommonModule,
        CardModule,
        MatButtonModule,
        MatFormFieldModule,
        FormsModule,
        ReactiveFormsModule,
        MatInputModule,
        TranslateModule,
    ]
})
export class NotificationFormModule { }
