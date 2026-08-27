import { NgModule } from '@angular/core';

import { AgGridModule } from 'ag-grid-angular';

import {RouterModule} from "@angular/router";
import {MatListModule} from "@angular/material/list";
import {MatDialogModule} from "@angular/material/dialog";

import {MatSlideToggleModule} from "@angular/material/slide-toggle";

import {MatSelectModule} from "@angular/material/select";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {CommonModule} from "@angular/common";

import {MatButtonModule} from "@angular/material/button";
import {MatInputModule} from "@angular/material/input";
import {UploadCreativeModalComponent} from "./upload-creative-modal/upload-creative-modal.component";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {MatCardModule} from "@angular/material/card";
import {MatIconModule} from "@angular/material/icon";
import {MatRadioModule} from "@angular/material/radio";

import {MatTooltipModule} from "@angular/material/tooltip";

import {MatCheckboxModule} from "@angular/material/checkbox";

import { CustomHeaderPageComponent } from './custom-header-page/custom-header-page.component';

import {MatChipsModule} from "@angular/material/chips";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import { AutocompleteComponent } from './autocomplete/autocomplete/autocomplete.component';

import { ManageUsersAggridComponent } from './manage-users-aggrid/manage-users-aggrid.component';
import {ManageUsersActionsRendererComponent} from "./data-grid/manage-users-actions-renderer.component";
import {PendingAggridComponent} from "./pending-aggrid/pending-aggrid.component";
import {PendingActionsRendererComponent} from "./data-grid/pending-actions-renderer.component";

import {MatTableModule} from "@angular/material/table";
import {MatExpansionModule} from "@angular/material/expansion";
import {PendingChangeUserLinkRendererComponent} from "./data-grid/pending-change-user-link-renderer.component";
import {MeetingLinksActionsRendererComponent} from "./data-grid/meeting-links-actions-renderer.component";

import {SingleAutocompleteComponent} from "./autocomplete/single-autocomplete/single-autocomplete.component";

import {MatDividerModule} from "@angular/material/divider";

import {CardModule} from "../theme/shared/components";

import {AgGridLoading} from "./data-grid/ag-grid-loading";
import {AgGridTableComponent} from './ag-grid-table/ag-grid-table.component';
import {PendingDateRendererComponent} from "./data-grid/pending-date-renderer.component";
import {UploadFilesComponent} from "../tslen-components/upload/upload-files/upload-files.component";
import {ModalDialogHeaderComponent} from "./modal-dialog-header/modal-dialog-header.component";
import {PreviewModalComponent} from './preview-modal/preview-modal.component';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [

    UploadCreativeModalComponent,

      CustomHeaderPageComponent,
      AutocompleteComponent,

      ManageUsersAggridComponent,
      ManageUsersActionsRendererComponent,
      PendingAggridComponent,
      PendingActionsRendererComponent,
      PendingChangeUserLinkRendererComponent,
      MeetingLinksActionsRendererComponent,

      SingleAutocompleteComponent,

      AgGridLoading,
      AgGridTableComponent,
      PendingDateRendererComponent,
      PreviewModalComponent,
  ],
    imports: [
        TranslateModule,
        RouterModule,
        AgGridModule,
        MatListModule,
        MatDialogModule,
        MatSlideToggleModule,
        MatSelectModule,
        MatButtonModule,
        MatInputModule,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatProgressBarModule,
        MatCardModule,
        MatIconModule,
        MatRadioModule,
        MatTooltipModule,
        MatTableModule,
        MatExpansionModule,
        MatCheckboxModule,
        MatChipsModule,
        MatAutocompleteModule,
        MatDividerModule,
        CardModule,
        UploadFilesComponent,
        ModalDialogHeaderComponent,
    ],
    exports: [

        CustomHeaderPageComponent,
        AutocompleteComponent,
        ManageUsersAggridComponent,
        ManageUsersActionsRendererComponent,
        PendingAggridComponent,
        PendingActionsRendererComponent,
        PendingChangeUserLinkRendererComponent,
        MeetingLinksActionsRendererComponent,

        AgGridLoading,
        AgGridTableComponent,
        SingleAutocompleteComponent
    ]
})
export class ComponentsModule {}
