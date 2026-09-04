import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MainCalendarModule} from '../../tslen-components/main-calendar/main-calendar.module';
import {PersonalScheduleComponent} from './personal-schedule-component/personal-schedule.component';
import {PersonalScheduleRoutingModule} from "./personal-schedule-routing.module";
import {HelpersModule} from '../../helpers/helpers.module';

@NgModule({
  declarations: [PersonalScheduleComponent],
  imports: [
    CommonModule,
    MainCalendarModule,
      PersonalScheduleRoutingModule,
    HelpersModule
  ]
})
export class PersonalScheduleModule { }
