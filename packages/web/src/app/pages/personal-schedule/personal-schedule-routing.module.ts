import { NgModule } from '@angular/core';
import {RouterModule, Routes} from "@angular/router";
import {PersonalScheduleComponent} from "./personal-schedule-component/personal-schedule.component";

const routes: Routes = [
  {
    path: '',
    component: PersonalScheduleComponent, data: { animation: 'PersonalScheduleComponent'}
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PersonalScheduleRoutingModule {

}
