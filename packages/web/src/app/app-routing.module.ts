import { NgModule } from '@angular/core';
import {Routes, RouterModule, provideRouter, withComponentInputBinding} from '@angular/router';
import { AdminComponent } from './theme/layout/admin/admin.component';
import {AuthComponent} from './theme/layout/auth/auth.component';
import {AuthGuard} from "./guards/auth.guard";
import {RoleGuard} from "./guards/role.guard";

const routes: Routes = [
  {
    path: '',
    redirectTo: 'pages/main-wall',
    pathMatch: 'full'
  },
  {
    path: '',
    component: AuthComponent,
    children: [
      {
        path: 'auth',
        loadChildren: () => import('./pages/authentication/authentication.module').then(module => module.AuthenticationModule)
      }
    ]
  },

  {
    path: '',
    component: AdminComponent,
    children: [
      {
        path: '',
        redirectTo: 'pages/main-wall',
        pathMatch: 'full'
      },
      {
        path: 'pages',
        loadChildren: () => import('./pages/pages.module').then(module => module.PagesModule)
      },
      {
        path: 'admin',
        loadChildren: () => import('./admin/admin.module').then(module => module.AdminModule),
        canActivate : [RoleGuard],
        data: {roles: ['admin', 'manager']}
      }
    ],
    canActivate : [AuthGuard]
  },
  {
    path: 'meet/:token',
    loadComponent: () => import('./guest-meeting/guest-meeting-landing.component').then(m => m.GuestMeetingLandingComponent),
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  },
];

@NgModule({
  providers: [
    provideRouter(routes, withComponentInputBinding())
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
