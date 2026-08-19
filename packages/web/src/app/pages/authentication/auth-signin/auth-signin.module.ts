import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthSigninRoutingModule } from './auth-signin-routing.module';
import {CardModule} from "../../../theme/shared/components";
import {CookieService} from "ngx-cookie-service";

@NgModule({
  imports: [
    CommonModule,
    AuthSigninRoutingModule,
      CardModule
  ],
})
export class AuthSigninModule { }
