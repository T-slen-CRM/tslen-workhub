import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {CommonScheduleRoutingModule} from "./common-schedule-routing.module";
import {CardModule} from "../../theme/shared/components";
import {CommonScheduleComponent} from "./common-schedule/common-schedule.component";
import {ComponentsModule} from "../../components/components.module";
import {TslenComponentsModule} from "../../tslen-components/tslen-components.module";
import {FlatpickrModule} from "angularx-flatpickr";
import {CalendarModule, DateAdapter} from "angular-calendar";
import {adapterFactory} from "angular-calendar/date-adapters/date-fns";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {CalendarDayoffWindowComponent} from "../../feature/calendar-dayoff-window/calendar-dayoff-window.component";
import {MatButtonToggleModule} from "@angular/material/button-toggle";
import {ReactiveFormsModule} from "@angular/forms";
import {MatTooltipModule} from "@angular/material/tooltip";
import { TranslateModule } from '@ngx-translate/core';



@NgModule({
  declarations: [
    CommonScheduleComponent,
  ],
    imports: [
        TranslateModule,
        CommonModule,
        CommonScheduleRoutingModule,
        CardModule,
        ComponentsModule,
        TslenComponentsModule,
        FlatpickrModule.forRoot(),
        CalendarModule.forRoot({
            provide: DateAdapter,
            useFactory: adapterFactory,
        }),
        MatIconModule,
        MatButtonModule,
        CalendarDayoffWindowComponent,
        MatButtonToggleModule,
        ReactiveFormsModule,
        MatTooltipModule
    ]
})
export class CommonScheduleModule { }
