import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddUserComponent } from './add-user/add-user.component';
import {CreateEventDialogComponent} from './create-event-dialog/create-event-dialog.component';
import {FlatpickrModule} from 'angularx-flatpickr';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatDialogModule} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatTabsModule} from "@angular/material/tabs";
import {MatTableComponent} from "./mat-table/mat-table.component";
import {CreateOneEventDialogComponent} from "./create-one-event-dialog/create-one-event-dialog.component";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatSelectModule} from "@angular/material/select";
import {MatIconModule} from "@angular/material/icon";
import {DaysOffItemsComponent} from "./days-off-items/days-off-items.component";
import {HideItemDirective} from "../directives/hide-item.directive";
import {DaysHeaderComponent} from "./ag-grid/days-header/days-header.component";
import { DaysOffCellRendererComponent } from './ag-grid/days-off-cell-renderer/days-off-cell-renderer.component';
import { NameAvatarCellRendererComponent } from './ag-grid/name-avatar-cell-renderer/name-avatar-cell-renderer.component';
import { PostsComponent } from './posts/posts.component';
import {MatCardModule} from "@angular/material/card";
import {MatBadgeModule} from "@angular/material/badge";
import {TextEditorComponent} from "./text-editor/text-editor.component";
import {MatTooltipModule} from "@angular/material/tooltip";
import {
    PermissionsVisualizationDirective
} from "../theme/shared/directives/permissions-visualization/permissions-visualization.directive";
import { RouterLink } from "@angular/router";
import {CopyTextDirective} from "./directives/copy-text.directive";
import {MatDatepickerModule} from "@angular/material/datepicker";
import {MatNativeDateModule} from "@angular/material/core";
import {DateTimeInputComponent} from "../feature/date-time-input/date-time-input.component";
import {ComponentsModule} from "../components/components.module";
import { TranslateModule } from '@ngx-translate/core';
import { InventoryRenderComponent } from './ag-grid/inventory-render/inventory-render.component';
import { AuditLogChangesRenderComponent } from './ag-grid/audit-log-changes-render/audit-log-changes-render.component';

@NgModule({
  declarations: [
    AddUserComponent,
    CreateEventDialogComponent,
      CreateOneEventDialogComponent,
      DaysHeaderComponent,
      DaysOffCellRendererComponent,
      NameAvatarCellRendererComponent,
      PostsComponent,
      InventoryRenderComponent,
      AuditLogChangesRenderComponent
  ],
    exports: [
        AddUserComponent,
        PostsComponent
    ],
    imports: [
        TranslateModule,
        CommonModule,
        FlatpickrModule.forRoot(),
        FormsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatTabsModule,
        MatTableComponent,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        MatSelectModule,
        MatIconModule,
        DaysOffItemsComponent,
        HideItemDirective,
        MatCardModule,
        MatBadgeModule,
        TextEditorComponent,
        MatTooltipModule,
        PermissionsVisualizationDirective,
        RouterLink,
        CopyTextDirective,
        RouterLink,
        MatDatepickerModule,
        MatNativeDateModule,
        DateTimeInputComponent,
        ComponentsModule
    ]
})
export class TslenComponentsModule { }
