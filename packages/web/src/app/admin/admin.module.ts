import { NgModule } from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {SharedModule} from "../theme/shared/shared.module";
import {AdminRoutingModule} from "./admin-routing.module";
import {ComponentsModule} from "../components/components.module";
import {MatSelectModule} from "@angular/material/select";
import {DatePickerModule} from "../theme/shared/components/date-picker/date-picker.module";
import {MatIconModule} from "@angular/material/icon";
import {MatMenuModule} from "@angular/material/menu";
import {MatButtonModule} from "@angular/material/button";
import {MatTooltipModule} from "@angular/material/tooltip";
import { ManageUsersComponent } from './manage-users/manage-users.component';
import {ManageUserUpdateComponent} from "./manage-users/manage-user-update/manage-user-update.component";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatInputModule} from "@angular/material/input";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {PendingComponent} from "./pending/pending.component";
import {DirectivesModule} from "../theme/shared/directives.module";
import {NotificationFormModule} from "../theme/shared/components/notification-form/notification-form.module";
import {MatTabsModule} from '@angular/material/tabs';
import {TslenComponentsModule} from "../tslen-components/tslen-components.module";

import {UsersModule} from "../pages/users/users.module";
import {UserJobPositionComponent} from "../pages/users/user-job-position/user-job-position.component";
import {MatCardModule} from "@angular/material/card";

import {MatBadgeModule} from "@angular/material/badge";

import {UserOnStageComponent} from "../feature/users/user-on-stage/user-on-stage.component";
import {
    PermissionsVisualizationDirective
} from "../theme/shared/directives/permissions-visualization/permissions-visualization.directive";
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
    imports: [
        TranslateModule,
        CommonModule,
        SharedModule,
        DirectivesModule,
        AdminRoutingModule,
        ComponentsModule,
        MatSelectModule,
        DatePickerModule,
        MatIconModule,
        MatMenuModule,
        MatButtonModule,
        MatTooltipModule,
        MatCheckboxModule,
        FormsModule,
        ReactiveFormsModule,
        MatInputModule,
        MatFormFieldModule,
        NotificationFormModule,
        MatTabsModule,
        TslenComponentsModule,
        UsersModule,
        UserJobPositionComponent,
        MatCardModule,
        NgOptimizedImage,
        MatBadgeModule,
        UserOnStageComponent
    ],
  declarations: [
      ManageUserUpdateComponent,
      PendingComponent,
  ],
})
export class AdminModule { }
