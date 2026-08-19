import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentsModule } from 'src/app/components/components.module';
import { CallRoutingModule } from './call-routing.module';
import {IncomingCallComponent} from "../../components/incoming-call/incoming-call.componet";

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    CallRoutingModule,
    ComponentsModule,
    IncomingCallComponent
  ]
})
export class CallModule {}

