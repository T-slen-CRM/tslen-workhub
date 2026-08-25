import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder } from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ITaskProject } from '../../interfaces/tasks';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  IPermissionTableColumn,
  IProjectPermission,
} from '../../interfaces/taskProjectPermission';
import { MatTableDynamicComponent } from '../mat-table-dynamic/mat-table-dynamic.component';
import { AuthData, AuthenticationService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { map, Subject, takeUntil, tap } from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import { ComponentsModule } from '../../components/components.module';
import { ProjectMemberActionButton } from '../mat-table-dynamic/data-grid/project-member-action-button/project-member-action-button';
import {
  IPermissionChangedRow,
  MatTableService,
} from '../../services/matTableService';
import { distinctUntilChanged } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../language/language.service';

@Component({
  selector: 'app-task-project-members',
  imports: [
    CommonModule,
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    MatTableDynamicComponent,
    ComponentsModule,
    TranslateModule,
  ],
  templateUrl: './task-project-members.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./task-project-members.component.scss'],
})
export class TaskProjectMembersComponent implements OnInit, OnDestroy {
  private readonly destroy$: Subject<void>;
  public projectId: number;
  public incomingProject: ITaskProject;
  public deleteDisabled: boolean;
  public tableColumns: IPermissionTableColumn[] = [];
  public projectPermissions: IProjectPermission[];
  public addedPermission: IProjectPermission;
  private authData: AuthData;
  public preparedUsersData$: any;
  public preparedUsersData: any[] = [];
  public selectedUserPermission: IProjectPermission[] = [];
  public usersInPermissionTable: any[] = [];
  public autoSelectedUsers: any[] = [];
  public userData: any;
  public addedData: boolean;
  public deletedPermission: IProjectPermission;
  public userRoleInProject: string;
  private lastLang: string;

  constructor(
    public dialog: MatDialog,
    public matDialogRef: MatDialogRef<TaskProjectMembersComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private formBuilder: FormBuilder,
    private authService: AuthenticationService,
    private dataService: DataService,
    private matTableService: MatTableService,
    private languageService: LanguageService,
  ) {
    this.authData = this.authService.authDataSignal();
    this.tableColumns = [
      // {field: 'id', headerName: 'Id', permission: ['admin', 'manager', 'user']},
      { field: 'userId', headerName: 'userId', permission: ['admin', 'write'] },
      {
        field: 'userName',
        headerName: 'User name',
        permission: ['admin', 'write'],
      },
      {
        field: 'permission',
        headerName: 'Permission',
        permission: ['admin', 'write'],
      },
      // {field: 'created', headerName: 'Created', component: DateTransformComponent, permission: ['admin', 'manager', 'advert']},
      {
        field: 'delete',
        headerName: 'Delete',
        component: ProjectMemberActionButton,
        permission: ['admin'],
      },
    ];
    this.destroy$ = new Subject<void>();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  ngOnInit() {
    this.projectId = this.data.id;
    if (this.data && this.data.taskProjectPermissions) {
      this.usersInPermissionTable = this.data.taskProjectPermissions;
      this.projectPermissions = this.data.taskProjectPermissions.map((item) => {
        // for current user
        if (item.userId === this.authData.id) {
          this.userRoleInProject = item.permission;
        }
        if (item.user) {
          item.userName = item.user.firstName + ' ' + item.user.lastName;
        }
        item.content = [[document.createTextNode(JSON.stringify(item))]];
        return item;
      });
      this.tableColumns = this.tableColumns.filter((item) =>
        item.permission.includes(this.userRoleInProject),
      );
    } else {
      this.deleteDisabled = true;
    }
    this.lastLang = this.languageService.currentLang;
    this.applyColumnTranslations();
    this.languageService.onLangChange.subscribe((event) => {
      if (event.lang !== this.lastLang) {
        this.lastLang = event.lang;
        this.applyColumnTranslations();
      }
    });
    this.getUsers();
    this.matTableService.changedMembersRow
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((changedMembersRow: IPermissionChangedRow) => {
        if (changedMembersRow) {
          const row = changedMembersRow.row;
          const action = changedMembersRow.action;
          if (action === 'delete' && !Array.isArray(row)) {
            /// if row.id is not null, it means we need to use unsavedId
            if (row && row.id) {
              this.projectPermissions = this.projectPermissions.filter(
                (perm) => perm.id !== row.id,
              );
            } else if (row.unsavedId) {
              this.projectPermissions = this.projectPermissions.filter(
                (perm) => perm.unsavedId !== row.unsavedId,
              );
            }

            this.deletedPermission = row;
          } else if (action === 'add' && Array.isArray(row)) {
            row.forEach((item: any) => {
              item.content = [[document.createTextNode(JSON.stringify(item))]];
              if (this.userData && this.userData.length > 0) {
                this.userData.forEach((user) => {
                  if (user.id === item.userId) {
                    item.userName = user.firstName + ' ' + user.lastName;
                  }
                });
              }
            });
            this.projectPermissions = this.projectPermissions.concat(row);
            this.addedData = !this.addedData;
          }
        }
      });
  }
  private applyColumnTranslations(): void {
    this.languageService
      .get([
        'task_project_members.column_user_id',
        'task_project_members.column_user_name',
        'task_project_members.column_permission',
        'task_project_members.column_delete',
      ])
      .subscribe((translations) => {
        const headerNameByField = {
          userId: translations['task_project_members.column_user_id'],
          userName: translations['task_project_members.column_user_name'],
          permission: translations['task_project_members.column_permission'],
          delete: translations['task_project_members.column_delete'],
        };
        this.tableColumns = this.tableColumns.map((column) => ({
          ...column,
          headerName: headerNameByField[column.field] ?? column.headerName,
        }));
      });
  }

  getUsers(): void {
    this.preparedUsersData$ = this.dataService.getAllUsers().pipe(
      map((response: HttpResponse<any>) => {
        const body = response.body;
        this.userData = body;
        return body.map((item) => {
          const oneUser = {
            group: `#${item.id} | ${item.firstName} ${item.lastName} | ${item.email}`,
            value: item.id,
          };
          if (
            this.usersInPermissionTable.find((user) => user.userId === item.id)
          ) {
            this.autoSelectedUsers.push(oneUser);
          }
          return oneUser;
        });
      }),
      tap((data) => {
        this.preparedUsersData = data.filter((item) => {
          return !this.autoSelectedUsers.find(
            (user) => user.value === item.value,
          );
        });
      }),
    );
  }

  closeDialog(action: string, result: any) {
    this.matDialogRef.close({ result, action });
  }
  //
  onSubmit() {
    this.data.taskProjectPermissions = this.data.taskProjectPermissions.concat(
      this.selectedUserPermission,
    );
    this.matTableService.changedMembersRow.next({
      row: this.selectedUserPermission,
      action: 'add',
      project: this.data,
    });
    this.selectedUserPermission = [];
  }


  getPermissionEntity(): IProjectPermission {
    return {
      userId: null,
      permission: 'write',
      unsavedId: Date.now(),
    };
  }
  getSelectedValues(event) {
    if (event.data && event.data.length) {
      this.selectedUserPermission = event.data.map((item) => {
        const entity = this.getPermissionEntity();
        return Object.assign(entity, { userId: item.value });
      });
    } else {
      this.selectedUserPermission = [];
    }
  }
}
