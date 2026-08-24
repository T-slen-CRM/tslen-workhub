import {
  Component,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { lastValueFrom, map, Observable, of, Subject, takeUntil } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { MatDialog } from '@angular/material/dialog';
import { ThemeService } from '../../services/theme.service';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { HelpersModule } from '../../helpers/helpers.module';
import { Router } from '@angular/router';
import { TaskProjectCreateEditComponent } from '../../tslen-components/task-project-create-edit/task-project-create-edit.component';
import { ITaskProject } from '../../interfaces/tasks';
import { MatButtonModule } from '@angular/material/button';
import { DeleteConfirmModalComponent } from '../../components/delete-confirm-modal/delete-confirm-modal.component';
import { HttpResponse } from '@angular/common/http';
import { MatMenuModule } from '@angular/material/menu';
import { TaskProjectMembersComponent } from '../../tslen-components/task-project-members/task-project-members.component';
import { IProjectPermission } from '../../interfaces/taskProjectPermission';
import {
  IPermissionChangedRow,
  MatTableService,
} from '../../services/matTableService';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-tasks-manager',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatIconModule,
    HelpersModule,
    MatButtonModule,
    MatMenuModule,
    TranslateModule,
  ],
  templateUrl: './tasks-manager.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./tasks-manager.component.scss'],
})
export class TasksManagerComponent implements OnInit, OnDestroy {
  private readonly destroy$: Subject<void>;
  public initLoading: boolean;
  public isDarkMode: boolean;
  public taskProjects$: Observable<ITaskProject[]>;
  private taskProjectDump: ITaskProject[];
  // private subscription: Subscription;

  constructor(
    private dataService: DataService,
    public dialog: MatDialog,
    private themeService: ThemeService,
    private router: Router,
    private matTableService: MatTableService,
  ) {
    this.destroy$ = new Subject<void>();
    // this.subscription = new Subscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  ngOnInit(): void {
    this.themeService.isDarkTheme
      .pipe(takeUntil(this.destroy$))
      .subscribe((mode) => {
        this.isDarkMode = !!mode;
      });
    this.initLoading = true;
    this.taskProjects$ = this.dataService
      .getObservableData('/task-project')
      .pipe(
        map((r) => {
          this.taskProjectDump = r;
          return r;
        }),
      );
    this.matTableService.changedMembersRow
      .pipe(takeUntil(this.destroy$))
      .subscribe((changedMembersRow: IPermissionChangedRow) => {
        if (changedMembersRow.project) {
          this.editProject(changedMembersRow.project);
        }
        if (changedMembersRow.action === 'delete') {
          const row = changedMembersRow.row as IProjectPermission;
          const projectId = row.projectId;
          const permissionId = row.id;
          const project = this.taskProjectDump.find(
            (proj: ITaskProject) => proj.id === projectId,
          );
          // remove permission by id
          project.taskProjectPermissions =
            project.taskProjectPermissions.filter(
              (perm: IProjectPermission) => perm.id !== permissionId,
            );
          this.editProject(project);
        }
        // if (changedMembersRow) {
        //   const row = changedMembersRow.row;
        //   const action = changedMembersRow.action;
        //   if (action === 'delete' && !Array.isArray(row)) {
        //     if (row && row.id){
        //       this.deleteProjectPermission(row);
        //     }
        //   } else if (action === 'add' && Array.isArray(row)) {
        //       this.saveProjectPermission(row);
        //   }
        // }
      });
  }
  openProject(project, event) {
    if (!event.target.classList.contains('mat-icon')) {
      this.router.navigate([
        '/pages/tasks-list/' + project.id,
        { title: project.name },
      ]);
    }
  }
  createEditProject(type, project = null) {
    const dialogConfig = {
      width: '400px',
      data: {},
    };
    if (type === 'edit') {
      dialogConfig.data = { project };
    }
    const dialogRef = this.dialog.open(
      TaskProjectCreateEditComponent,
      dialogConfig,
    );
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.result) {
        const data = result.result;
        if (type === 'edit') {
          this.editProject(data);
        } else {
          if (result.action === 'save') {
            this.saveProject(data);
          } else if (result.action === 'delete') {
            this.deleteProject(data);
          }
        }
      }
    });
  }
  saveProject(project: ITaskProject) {
    this.dataService
      .postData('/task-project', project)
      .pipe(takeUntil(this.destroy$))
      .subscribe((r: HttpResponse<any>) => {
        const newProject: ITaskProject = r.body;
        this.taskProjectDump.push(newProject);
        this.taskProjects$ = of(this.taskProjectDump);
      });
  }
  editProject(project: ITaskProject) {
    this.taskProjects$ = this.dataService
      .updateData('/task-project/', project.id, project)
      .pipe(
        takeUntil(this.destroy$),
        map((r: HttpResponse<any>) => {
          const projectInBody: ITaskProject = r.body;
          this.taskProjectDump = this.taskProjectDump.map(
            (proj: ITaskProject) => {
              if (proj.id === projectInBody.id) {
                return projectInBody;
              }
              return proj;
            },
          );
          return this.taskProjectDump;
        }),
      );
  }
  saveProjectPermission(permissions: IProjectPermission[]) {
    this.dataService
      .postData('/project-permission/create', { data: permissions })
      .pipe(takeUntil(this.destroy$))
      .subscribe((r: HttpResponse<any>) => {
        const projectPermission: IProjectPermission = r.body;
        this.taskProjectDump = this.taskProjectDump.map(
          (proj: ITaskProject) => {
            // get projectId from one of the permissions
            if (proj.id === projectPermission[0].projectId) {
              proj.taskProjectPermissions =
                proj.taskProjectPermissions.concat(projectPermission);
            }
            return proj;
          },
        );
        this.taskProjects$ = of(this.taskProjectDump);
      });
  }
  deleteProjectPermission(row: IProjectPermission) {
    this.taskProjectDump = this.taskProjectDump.map((proj: ITaskProject) => {
      if (proj.id === row.projectId) {
        proj.taskProjectPermissions = proj.taskProjectPermissions.filter(
          (perm: IProjectPermission) => perm.id !== row.id,
        );
      }
      return proj;
    });
    this.taskProjects$ = of(this.taskProjectDump);
  }

  async deleteProject(project: ITaskProject) {
    const confirm = await this.confirmDeleteDialog();
    if (confirm) {
      this.taskProjects$ = this.dataService
        .deleteData('/task-project/', +project.id)
        .pipe(
          map((r) => {
            this.taskProjectDump = this.taskProjectDump.filter(
              (proj: ITaskProject) => proj.id !== project.id,
            );
            return this.taskProjectDump;
          }),
        );
    }
  }
  async confirmDeleteDialog(): Promise<boolean> {
    const dialogRef = this.dialog.open(DeleteConfirmModalComponent, {
      width: '400px',
      data: { text: 'Do you want to delete this project?' },
    });
    return await lastValueFrom(dialogRef.afterClosed());
  }

  trackByFn(index: any, item: any): number {
    return item.index;
  }
  openProjectMembers(project: ITaskProject) {
    const dialogConfig = {
      width: '600px',
      data: project,
    };
    const dialogRef = this.dialog.open(
      TaskProjectMembersComponent,
      dialogConfig,
    );
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.result) {
        if (result.action === 'save') {
          this.saveProjectPermission(result.result);
        } else if (result.action === 'delete') {
          // this.confirmDeleteDialog(result.result);
        }
      }
    });
  }
}
