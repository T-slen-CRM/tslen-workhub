import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainWallComponent } from './main-wall/main-wall.component';
import {MainWallRoutingModule} from "./main-wall-routing.module";
import {TslenComponentsModule} from "../../tslen-components/tslen-components.module";
import {BirthdayListComponent} from "../../tslen-components/birthday-list/birthday-list.component";
import {AbsentUserComponent} from "../../tslen-components/absent-user/absent-user.component";
import {MatButtonModule} from "@angular/material/button";
import { TranslateModule } from '@ngx-translate/core';
import { LiveKitRoutingModule } from '../live-kit/live-kit-routing.module';

@NgModule({
  declarations: [
    MainWallComponent
  ],
    imports: [
        TranslateModule,
        CommonModule,
        MainWallRoutingModule,
        TslenComponentsModule,
        BirthdayListComponent,
        AbsentUserComponent,
        MatButtonModule,
        LiveKitRoutingModule
    ]
})
export class MainWallModule { }
