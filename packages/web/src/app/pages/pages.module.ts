import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import {RouterModule} from "@angular/router";

import {PagesRoutingModule, routes} from './pages-routing.module'

import {DatePickerModule} from "../theme/shared/components/date-picker/date-picker.module";
import {CommonScheduleModule} from "./common-schedule/common-schedule.module";
import {PersonalScheduleModule} from "./personal-schedule/personal-schedule.module";
import {MainWallModule} from "./main-wall/main-wall.module";
import {UsersModule} from "./users/users.module";
import { LiveKitModule } from './live-kit/live-kit.module';
import { CallModule } from './call/call.module';
import {ChatComponent} from "./chat/chat.component";
@NgModule({
    imports: [
        CommonModule,
        PagesRoutingModule,
        DatePickerModule,
        CommonScheduleModule,
        PersonalScheduleModule,
        MainWallModule,
        UsersModule,
        LiveKitModule,
        CallModule,
        ChatComponent
    ],
    exports: [RouterModule],
  declarations: [

  ]
})
export class PagesModule { }
