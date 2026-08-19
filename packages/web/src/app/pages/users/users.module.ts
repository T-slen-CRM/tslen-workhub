import { NgModule } from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {UserProfileComponent} from "./user-profile/user-profile.component";
import {UserGroupComponent} from "./user-group/user-group.component";
import {ComponentsModule} from "../../components/components.module";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {CardModule} from "../../theme/shared/components";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {DaysOffFormComponent} from "../../tslen-components/days-off-form/days-off-form.component";
import {GoogleCalendarComponent} from "../../tslen-components/google-calendar/google-calendar.component";
import {MatTabsDynamicComponent} from "../../tslen-components/mat-tabs-dynamic/mat-tabs-dynamic.component";
import {TabDirective} from "../../tslen-components/directives/tab.directive";
import {
    PermissionsVisualizationDirective
} from "../../theme/shared/directives/permissions-visualization/permissions-visualization.directive";
import {UploadFilesComponent} from "../../tslen-components/upload/upload-files/upload-files.component";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {DateTimeInputComponent} from "../../feature/date-time-input/date-time-input.component";
import {UserDayoffHistoryComponent} from "../../feature/users/user-dayoff-history/user-dayoff-history.component";
import {MatIconModule} from "@angular/material/icon";
import {GooglePermissionsComponent} from "../../tslen-components/google-permissions/google-permissions.component";
import { TranslateModule } from '@ngx-translate/core';



@NgModule({
  declarations: [UserProfileComponent,
    UserGroupComponent,
  ],
  exports: [
    UserProfileComponent,
    UserGroupComponent,
  ],
    imports: [
        TranslateModule,
        CommonModule,
        ComponentsModule,
        MatInputModule,
        MatSelectModule,
        CardModule,
        ReactiveFormsModule,
        MatButtonModule,
        DaysOffFormComponent,
        GoogleCalendarComponent,
        MatTabsDynamicComponent,
        TabDirective,
        PermissionsVisualizationDirective,
        UploadFilesComponent,
        MatCheckboxModule,
        DateTimeInputComponent,
        UserDayoffHistoryComponent,
        NgOptimizedImage,
        MatIconModule,
        GooglePermissionsComponent
    ]
})
export class UsersModule { }
