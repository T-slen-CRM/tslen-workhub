import {
  Component,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DataService } from '../../services/data.service';
import { ManageUsersActionsRendererComponent } from '../data-grid/manage-users-actions-renderer.component';
import { AuthenticationService } from '../../services/auth.service';
import { LanguageService } from '../../language/language.service';

@Component({
  selector: 'app-manage-users-aggrid',
  templateUrl: './manage-users-aggrid.component.html',
  styleUrls: ['./manage-users-aggrid.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class ManageUsersAggridComponent implements OnInit {
  lastLang;
  columnDefs;
  defaultColDef;
  rowSelection;
  gridApi;

  rowData: any = [];
  components = {
    manageUsersActionsRendererComponent: ManageUsersActionsRendererComponent,
  };

  private authService = inject(AuthenticationService);
  constructor(
    public dataService: DataService,
    private translateService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.lastLang = this.translateService.currentLang;
    this.loadColumnDefs();

    this.translateService.onLangChange.subscribe((event) => {
      if (event.lang !== this.lastLang) {
        this.lastLang = event.lang;
        this.loadColumnDefs();
      }
    });
  }

  loadColumnDefs(): void {
    const authData = this.authService.authDataSignal();

    this.translateService
      .get([
        'manage_users.name',
        'manage_users.id',
        'manage_users.email',
        'manage_users.phone',
        'manage_users.birthday',
        'manage_users.position',
        'manage_users.actions',
      ])
      .subscribe((translations) => {
        this.columnDefs = [
          {
            headerName: translations['manage_users.name'],
            field: 'username',
            minWidth: 230,
            cellRenderer: (params) => {
              return `<a href="/pages/user-card-info/${params.data.id}">${
                params.data.firstName + ' ' + params.data.lastName
              }</a>`;
            },
            pinned: 'left',
          },
          {
            headerName: translations['manage_users.id'],
            field: 'id',
            minWidth: 230,
          },
          {
            headerName: translations['manage_users.email'],
            field: 'email',
            minWidth: 230,
          },
          {
            headerName: translations['manage_users.phone'],
            field: 'phone',
            minWidth: 230,
          },
          {
            headerName: translations['manage_users.birthday'],
            field: 'birthDay',
            minWidth: 230,
          },
          {
            headerName: translations['manage_users.position'],
            field: 'jobPositionDetails',
            minWidth: 230,
            valueFormatter: (params) =>
              params.value ? params.value.title : '',
          },
        ];

        if (['admin', 'manager'].includes(authData.role)) {
          this.columnDefs.push({
            headerName: translations['manage_users.actions'],
            field: 'actions',
            cellRenderer: 'manageUsersActionsRendererComponent',
          });
        }
      });
    this.defaultColDef = {
      minWidth: 120,
      editable: false,
      sortable: true,
      resizable: true,
      flex: 1,
      suppressSizeToFit: true,
      filter: true,
    };
    this.rowSelection = 'single';

    this.rowData = this.dataService.getAgGridData('/users');
  }
}
