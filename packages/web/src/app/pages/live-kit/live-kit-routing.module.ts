import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LiveKitComponent } from './live-kit.component';

const routes: Routes = [
  {
    path: '',
    component: LiveKitComponent,
    data: { animation: 'LiveKitComponent' }
  },
  {
    path: 'join/:token',
    loadComponent: () => import('./join-meeting-link/join-meeting-link.component').then(m => m.JoinMeetingLinkComponent),
    data: { animation: 'JoinMeetingLinkComponent' }
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
  ],
  exports: [RouterModule]
})
export class LiveKitRoutingModule {}
