import { NgModule } from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {MainWallComponent} from './main-wall/main-wall.component';

const routes: Routes = [
  {
    path: '',
    component: MainWallComponent, data: { animation: 'MainWallComponent'}
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MainWallRoutingModule {

}
