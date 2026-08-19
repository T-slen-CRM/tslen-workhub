import { NgModule } from '@angular/core';
import {RouterModule, Routes} from "@angular/router";
import {CommonScheduleComponent} from "./common-schedule/common-schedule.component";

const routes: Routes = [
  {
    path: '',
    component: CommonScheduleComponent, data: { animation: 'CommonScheduleComponent'}
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CommonScheduleRoutingModule {

}
