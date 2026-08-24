import {
  Component,
  inject,
  OnInit,
  Signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DataService } from '../../services/data.service';
import { ManageUsersActionsRendererComponent } from '../data-grid/manage-users-actions-renderer.component';
import { AuthenticationService } from '../../services/auth.service';
import { LanguageService } from '../../language/language.service';
import { CallButtonRendererComponent } from '../callButton/buttonRender.component';
import { TranslateModule } from '@ngx-translate/core';
import { LiveKitWebSocketService } from 'src/app/pages/live-kit/live-kitWebSocket.service';
import { ComponentsModule } from '../components.module';
import { UnsubscribeOnDestroyAdapter } from '../../helpers/UnsubscribeOnDestroyAdapter';
import { LiveChatService } from '../../tslen-components/live-chat/live-chat.service';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { NgClass, NgStyle } from '@angular/common';
import { UserGeneralData } from '../../interfaces/userConfig';

@Component({
  imports: [
    TranslateModule,
    ComponentsModule,
    MatListModule,
    MatIconModule,
    NgClass,
    NgStyle,
  ],
  selector: 'app-live-kit-table',
  templateUrl: './table-live-kit.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./table-live-kit.component.scss'],
})
export class CallUsersOnlineComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit
{
  lastLang: string;
  columnDefs: any[];
  defaultColDef: any;
  rowSelection: string;
  gridApi: any;

  rowData: any[] = [];
  userStatuses: Record<string, boolean> = {};

  frameworkComponents = {
    manageUsersActionsRendererComponent: ManageUsersActionsRendererComponent,
    callButtonRendererComponent: CallButtonRendererComponent,
  };

  private authService = inject(AuthenticationService);
  private liveChatService = inject(LiveChatService);
  // public selectedChatId: Signal<string> = this.liveChatService.getSelectedChatId();
  private user: any;
  constructor(
    public dataService: DataService,
    private translateService: LanguageService,
    private liveKitWebSocketService: LiveKitWebSocketService,
  ) {
    super();
    this.user = this.authService.authDataSignal();
  }

  ngOnInit(): void {
    this.lastLang = this.translateService.currentLang;
    this.loadColumnDefs();

    this.translateService.onLangChange.subscribe((event) => {
      if (event.lang !== this.lastLang) {
        this.lastLang = event.lang;
        this.loadColumnDefs();
      }
    });
    const usersSub = this.dataService
      .getAgGridData('/users')
      .subscribe((users) => {
        if (Array.isArray(users)) {
          this.rowData = users;
        } else if (users && Array.isArray((users as any).users)) {
          this.rowData = (users as any).users;
        } else {
          this.rowData = [];
        }
        if (Array.isArray(this.rowData) && this.rowData.length > 0) {
          this.liveChatService.setSelectedChatId(this.rowData[0]);
        }
        if (this.gridApi) {
          this.gridApi.setRowData(this.rowData);
          this.gridApi.refreshCells({ force: true, columns: ['username'] });
        }
      });
    this.subscription.add(usersSub);

    const online = this.liveKitWebSocketService.onlineStatus$.subscribe(
      (statusMap) => {
        this.userStatuses = statusMap;
        this.gridApi?.refreshCells({ force: true, columns: ['username'] });
      },
    );

    this.subscription.add(online);
  }

  loadColumnDefs(): void {
    this.translateService
      .get(['meet.call.list_name_company', 'meet.call.call_button'])
      .subscribe((translations) => {
        // this.columnDefs = [
        //   {
        //     headerName: translations['meet.call.list_name_company'],
        //     field: 'username',
        //     minWidth: 170,
        //     // pinned: 'left',
        //     cellRenderer: params => {
        //       const isOnline = this.userStatuses?.[params.data.id] === true;
        //       const dotColor = isOnline ? 'green' : 'red';
        //       return `
        //         <a (click)="updateSelectedChatId()" style="display: inline-flex; align-items: center; gap: 5px;">
        //           <span style="
        //             display: inline-block;
        //             width: 8px;
        //             height: 8px;
        //             background-color: ${dotColor};
        //             border-radius: 50%;
        //             animation: pulse 1.5s infinite;">
        //           </span>
        //           ${params.data.firstName} ${params.data.lastName}
        //         </a>
        //       `;
        //     }
        //   },
        //   {
        //     headerName:  translations['meet.call.call_button'],
        //     field: 'action',
        //     cellRenderer: 'callButtonRendererComponent',
        //     minWidth: 200
        //   }
        // ];

        if (['admin', 'manager'].includes(this.user.userRole)) {
          this.columnDefs.push({
            headerName: translations['manage_users.actions'],
            field: 'actions',
            cellRenderer: 'manageUsersActionsRendererComponent',
          });
        }

        this.defaultColDef = {
          minWidth: 120,
          editable: false,
          sortable: true,
          resizable: true,
          flex: 1,
          enableCellTextSelection: true,
          suppressSizeToFit: true,
          filter: true,
        };

        this.rowSelection = 'single';
      });
  }

  onGridReady(params: any): void {
    this.gridApi = params.api;
    if (this.rowData.length > 0) {
      this.gridApi.setRowData(this.rowData);
    }
  }
  updateSelectedChatId(chatId: UserGeneralData): void {
    this.liveChatService.setSelectedChatId(chatId);
  }
}
