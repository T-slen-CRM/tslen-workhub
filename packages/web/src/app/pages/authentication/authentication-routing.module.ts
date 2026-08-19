import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {RegistrationConfirmComponent} from "./registration-confirm/registration-confirm.component";
import {ResetPasswordComponent} from "./reset-password/reset-password.component";
import {AuthSigninComponent} from "./auth-signin/auth-signin.component";
import {AuthSignupComponent} from "./auth-signup/auth-signup.component";
import {AuthResetPasswordComponent} from "./auth-reset-password/auth-reset-password.component";
import {AuthChangePasswordComponent} from "./auth-change-password/auth-change-password.component";
import {AuthGuard} from "../../guards/auth.guard";

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'signup',component: AuthSignupComponent
      },
      {
        path: 'login', component: AuthSigninComponent
      },
      {
        path: 'confirm', component: RegistrationConfirmComponent
      },
      {
        path: 'reset-password', component: AuthResetPasswordComponent
      },
      {
        path: 'reset', component: ResetPasswordComponent
      },
      {
        path: 'change-password', component: AuthChangePasswordComponent}
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthenticationRoutingModule { }
