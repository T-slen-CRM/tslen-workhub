import {RouterModule, Routes} from '@angular/router';
import {UserProfileComponent} from "./users/user-profile/user-profile.component";
import {NgModule} from "@angular/core";
import {ManageUsersComponent} from "../admin/manage-users/manage-users.component";
import {UserCardInfoComponent} from "./users/user-card-info/user-card-info.component";
import {MeetComponent} from "./meet/meet.component";
import {ChatComponent} from "./chat/chat.component";

export const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'user-profile/:id', component: UserProfileComponent, data: { animation: 'UserProfileComponent'},
        // loadChildren: () => import('./main-campaigns-page.module').then(module => module.MainCampaignsPageModule)
      },
      {
        path: 'common-schedule',
        loadChildren: () => import('./common-schedule/common-schedule.module').then(module => module.CommonScheduleModule)
      },
      {
        path: 'personal-schedule',
        loadChildren: () => import('./personal-schedule/personal-schedule.module').then(module => module.PersonalScheduleModule)
      },
      {
        path: 'main-wall',
        loadChildren: () => import('./main-wall/main-wall.module').then(module => module.MainWallModule)
      },
      {
        path: 'tasks-manager',
        loadComponent: () => import('./tasks-manager/tasks-manager.component').then(module => module.TasksManagerComponent)
      },
      {
        path: 'tasks-list/:id',
        loadComponent: () => import('./tasks-list/tasks-list.component').then(module => module.TasksListComponent)
      },
      {
        path: 'live-kit',
        loadChildren: () => import('./live-kit/live-kit.module').then(module => module.LiveKitModule)
      },
      {
        path: 'call/:callerId/:calleeId',
        loadChildren: () => import('./call/call.module').then(module => module.CallModule)
      },
      {
        path: 'manage-users', component: ManageUsersComponent, data: { animation: 'ManageUsersComponent'}
      },
      {
        path: 'user-card-info/:id', component: UserCardInfoComponent, data: { animation: 'UserCardInfoComponent'}
      },
      {
        path: 'meet', component: MeetComponent, data: { animation: 'MeetComponent'}
      },
      {
        path: 'chat', component: ChatComponent, data: { animation: 'ChatComponent' }
      }
      ]
  },
];
@NgModule({
  imports: [
    RouterModule.forChild(routes),
  ],
  exports: [RouterModule]
})
export class PagesRoutingModule {}
