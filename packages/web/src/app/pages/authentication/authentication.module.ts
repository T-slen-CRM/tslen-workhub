import { NgModule } from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';

import { AuthenticationRoutingModule } from './authentication-routing.module';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {AuthSigninComponent} from './auth-signin/auth-signin.component';
import {RegistrationConfirmComponent} from "./registration-confirm/registration-confirm.component";
import {ResetPasswordComponent} from "./reset-password/reset-password.component";
import {AuthSignupComponent} from "./auth-signup/auth-signup.component";
import {AuthResetPasswordComponent} from "./auth-reset-password/auth-reset-password.component";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatIconModule} from "@angular/material/icon";
import {HelpersModule} from "../../helpers/helpers.module";
import { AuthHeaderComponent } from './auth-header/auth-header.component';
import {MatButtonModule} from "@angular/material/button";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import { LanguageConfigurationModule } from 'src/app/language/languageConfiguration.module';

@NgModule({
    imports: [
        CommonModule,
        AuthenticationRoutingModule,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        HelpersModule,
        MatButtonModule,
        NgOptimizedImage,
        MatProgressSpinnerModule,
        LanguageConfigurationModule
    ],
  declarations: [
    ResetPasswordComponent,
      AuthSigninComponent,
      AuthSignupComponent,
      RegistrationConfirmComponent,
      ResetPasswordComponent,
      AuthResetPasswordComponent,
      AuthHeaderComponent,
  ]
})
export class AuthenticationModule { }
