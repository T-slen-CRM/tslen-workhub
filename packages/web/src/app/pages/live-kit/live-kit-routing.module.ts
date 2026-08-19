import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LiveKitComponent } from './live-kit.component';

const routes: Routes = [
  {
    path: '',
    component: LiveKitComponent,
    data: { animation: 'LiveKitComponent' }
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
  ],
  exports: [RouterModule]
})
export class LiveKitRoutingModule {}
