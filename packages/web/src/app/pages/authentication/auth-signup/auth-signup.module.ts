import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthSignupRoutingModule } from './auth-signup-routing.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
      CommonModule,
      AuthSignupRoutingModule,
       TranslateModule
  ],
  declarations: []
})
export class AuthSignupModule { }
