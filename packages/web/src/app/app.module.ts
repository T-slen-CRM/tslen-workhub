import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { APP_INITIALIZER, NgModule} from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { SharedModule } from './theme/shared/shared.module';
import { AppComponent } from './app.component';
import { AdminComponent } from './theme/layout/admin/admin.component';
import { AuthComponent } from './theme/layout/auth/auth.component';
import { NavigationComponent } from './theme/layout/admin/navigation/navigation.component';
import { NavContentComponent } from './theme/layout/admin/navigation/nav-content/nav-content.component';
import { NavGroupComponent } from './theme/layout/admin/navigation/nav-content/nav-group/nav-group.component';
import { NavCollapseComponent } from './theme/layout/admin/navigation/nav-content/nav-collapse/nav-collapse.component';
import { NavItemComponent } from './theme/layout/admin/navigation/nav-content/nav-item/nav-item.component';
import { NavBarComponent } from './theme/layout/admin/nav-bar/nav-bar.component';
import { NavLeftComponent } from './theme/layout/admin/nav-bar/nav-left/nav-left.component';
import { NavSearchComponent } from './theme/layout/admin/nav-bar/nav-left/nav-search/nav-search.component';
import { NavRightComponent } from './theme/layout/admin/nav-bar/nav-right/nav-right.component';
import { ConfigurationComponent } from './theme/layout/admin/configuration/configuration.component';

import { ToggleFullScreenDirective } from './theme/shared/full-screen/toggle-full-screen';

/* Menu Items */
import { NavigationItem } from './theme/layout/admin/navigation/navigation';

import { FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {HttpRequestInterceptor} from './services/http-request.interceptor';

import {AuthenticationModule} from "./pages/authentication/authentication.module";
import {ToastrModule} from "ngx-toastr";
import {MatBadgeModule} from "@angular/material/badge";
import {WINDOW_PROVIDERS} from "./injection/window";
import { ErrorInterceptor } from './services/error.interceptor';
import {MatMenuModule} from "@angular/material/menu";
import {LoaderInterceptor} from './interceptors/loader.interceptor';
import {AuthInterceptor} from "./interceptors/auth.interceptor";
import {TimerComponent} from "./feature/timer-pomodoro/timer/timer.component";
import { LanguageConfigurationModule } from './language/languageConfiguration.module';
import { CallButtonRendererComponent } from './components/callButton/buttonRender.component';
import { LanguageService } from './language/language.service';
import { IncomingCallComponent } from './components/incoming-call/incoming-call.componet';
import { LiveKitWebSocketService } from './pages/live-kit/live-kitWebSocket.service';
import {HelpersModule} from "./helpers/helpers.module";
import {CallComponent} from "./pages/call/wellcome/call.component";

export function initLang(langService: LanguageService) {
  return () => langService.setDefaultLangFromBrowser();
}

@NgModule({ declarations: [
        AppComponent,
        AdminComponent,
        AuthComponent,
        NavigationComponent,
        NavContentComponent,
        NavGroupComponent,
        NavCollapseComponent,
        NavItemComponent,
        NavBarComponent,
        NavLeftComponent,
        NavSearchComponent,
        NavRightComponent,
        ConfigurationComponent,
        ToggleFullScreenDirective,
    ],
    bootstrap: [AppComponent], imports: [AppRoutingModule,
        BrowserModule,
        BrowserAnimationsModule,
        SharedModule,
        MatBadgeModule,
        FormsModule,
        ReactiveFormsModule,
        AuthenticationModule,
        // NgbModule,
        CommonModule,
        ToastrModule.forRoot({ timeOut: 3000 }),
        MatMenuModule,
        TimerComponent,
        LanguageConfigurationModule,
        HelpersModule,
        CallComponent], providers: [NavigationItem,
        WINDOW_PROVIDERS,
        { provide: APP_INITIALIZER, useFactory: () => () => { }, deps: [LiveKitWebSocketService], multi: true },
        { provide: APP_INITIALIZER, useFactory: initLang, deps: [LanguageService], multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: HttpRequestInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: LoaderInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }, provideHttpClient(withInterceptorsFromDi()),] })
export class AppModule { }

