import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import { FlatpickrModule } from 'angularx-flatpickr';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
// import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import {MainCalendarComponent} from './main-calendar-component/main-calendar.component';
import {MatButtonModule} from "@angular/material/button";
import {TslenComponentsModule} from "../tslen-components.module";
import {MatIconModule} from "@angular/material/icon";
import {MatSelectModule} from "@angular/material/select";
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
    imports: [
        TranslateModule,
        CommonModule,
        FormsModule,
        // NgbModalModule,
        FlatpickrModule.forRoot(),
        CalendarModule.forRoot({
            provide: DateAdapter,
            useFactory: adapterFactory,
        }),
        TslenComponentsModule,
        MatIconModule,
        MatButtonModule,
        MatSelectModule
    ],
  declarations: [MainCalendarComponent],
  exports: [MainCalendarComponent],
})
export class MainCalendarModule { }
