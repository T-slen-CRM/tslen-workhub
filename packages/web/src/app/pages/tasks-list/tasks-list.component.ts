import {
  Component,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, map, Subscription } from 'rxjs';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  IProjectPhasesRelations,
  ITask,
  ITaskList,
  ITaskPhase,
  ITaskProject,
} from '../../interfaces/tasks';
import { MatDialog } from '@angular/material/dialog';
import { TaskCreateEditComponent } from '../../tslen-components/task-create-edit/task-create-edit.component';
import { DeleteConfirmModalComponent } from '../../components/delete-confirm-modal/delete-confirm-modal.component';
import { ComponentsModule } from '../../components/components.module';
import { IProjectPermission } from '../../interfaces/taskProjectPermission';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TaskWebSocketService } from './taskWebSocket.service';
import { AuthData, AuthenticationService } from '../../services/auth.service';
import { MatMenuModule } from '@angular/material/menu';
import { TasksListService } from './service/tasks-list.service';
import { TaskPhaseCreateEditComponent } from './task-phase/task-phase-create-edit/task-phase-create-edit.component';
import { MatCardModule } from '@angular/material/card';
import { TaskPhaseSortComponent } from './task-phase/task-phase-sort/task-phase-sort.component';
import { HttpResponse } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { HelpersModule } from '../../helpers/helpers.module';

const enum TasksEvents {
  FIND_ALL = 'findAll',
  UPDATE = 'update',
  CREATE = 'create',
  DELETE = 'delete',
  MULTI_REORDERING = 'multi-reordering',
}
@Component({
  selector: 'app-tasks-list',
  imports: [
    CommonModule,
    DragDropModule,
    ScrollingModule,
    OverlayModule,
    MatIconModule,
    MatButtonModule,
    ComponentsModule,
    MatTooltipModule,
    RouterLink,
    MatMenuModule,
    MatCardModule,
    TranslateModule,
    HelpersModule,
  ],
  providers: [TasksListService],
  templateUrl: './tasks-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./tasks-list.component.scss'],
})
export class TasksListComponent implements OnInit, OnDestroy {
  public projectId: number;
  public projectTitle: string;
  public lists: ITaskList[];
  public tasks: ITask[];
  public phases: ITaskPhase[];
  public projectPhasesRelations: IProjectPhasesRelations[];
  public tasksList: ITask[] = [];
  public taskProject: ITaskProject;
  public projectPermissions: IProjectPermission[];
  public isLoadingProject = signal(false);
  private view = false;
  public globalTask = null;
  private readonly subscriptions$: Subscription;
  private authData: AuthData;
  constructor(
    private dataService: DataService,
    private router: Router,
    public dialog: MatDialog,
    public route: ActivatedRoute,
    private taskWebSocketService: TaskWebSocketService,
    private authService: AuthenticationService,
    private taskListService: TasksListService,
  ) {
    this.authData = this.authService.authDataSignal();
    this.subscriptions$ = new Subscription();
    const checkParams: Subscription = route.params.subscribe((params) => {
      if (params['task']) {
        if (!this.phases) {
          this.view = true;
        } else {
          this.view = false;
          this.createEditTask('edit', this.globalTask);
        }
      }
    });
    this.subscriptions$.add(checkParams);
  }
  ngOnDestroy(): void {
    this.subscriptions$.unsubscribe();
  }

  drop(event: CdkDragDrop<ITask[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      const reorderedList = event.container.data.map(
        (item: ITask, index: number) => {
          item.orderId = index;
          return item;
        },
      );
      this.updateTaskArray(reorderedList);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      const phaseId = +event.container.id;
      const tasks = event.container.data.map((item: ITask, index: number) => {
        item.phaseId = phaseId;
        item.orderId = index;
        return item;
      });
      this.updateTaskArray(tasks);
    }
  }
  ngOnInit(): void {
    this.taskWebSocketService
      .getMessages(TasksEvents.UPDATE)
      .subscribe((message: any) => {
        const task = message;
        const result = this.phases.map((item) => {
          const phaseId = item.id;
          const isTaskInList = item.tasks.find((key) => key.id === task.id);
          if (isTaskInList) {
            if (phaseId === task.phaseId) {
              item.tasks = item.tasks.map((key) => {
                if (key.id === task.id) {
                  key = task;
                }
                return key;
              });
            } else {
              item.tasks = item.tasks.filter((key) => key.id !== task.id);
            }
          } else {
            if (phaseId === task.phaseId) {
              item.tasks.push(task);
            }
          }
          return item;
        });
        this.phases = [...result];
        this.addTooltipToTask(this.phases);
      });
    this.taskWebSocketService
      .getMessages(TasksEvents.MULTI_REORDERING)
      .subscribe((tasks: any) => {
        const taskIdsFromEntries = Object.fromEntries(
          tasks.map((task: ITask) => [task.id, task]),
        );
        const commonPhaseId = tasks[0].phaseId;
        // check if task is in the list and in correct phase. Move to correct phase if not.
        // if task is in the list, update order
        const updatedLists = this.phases.map((phase: ITaskList) => {
          const phaseId = phase.id;
          phase.tasks = phase.tasks.reduce((acc, task: ITask) => {
            const taskFromEntries = taskIdsFromEntries[task.id];
            if (taskFromEntries) {
              if (taskFromEntries.phaseId === phaseId) {
                acc.push(taskFromEntries);
                // remove from taskIdsFromEntries
                delete taskIdsFromEntries[task.id];
              }
            } else {
              acc.push(task);
            }
            // add task to the list if it is not there
            return acc;
          }, []);
          if (
            commonPhaseId === phaseId &&
            Object.values(taskIdsFromEntries).length
          ) {
            phase.tasks = phase.tasks.concat(Object.values(taskIdsFromEntries));
          }
          phase.tasks = phase.tasks.sort((a, b) => a.orderId - b.orderId);
          return phase;
        });
        this.phases = [...updatedLists];
      });
    //delete
    this.taskWebSocketService
      .getMessages(TasksEvents.DELETE)
      .subscribe((id: any) => {
        this.phases = this.removeTaskFromList(id);
      });

    this.projectTitle = this.router.url.split(';')[1].split('=')[1];
    this.projectId = parseInt(this.router.url.split('/').pop(), 10);
    this.isLoadingProject.set(true);
    const projectData: Subscription = this.dataService
      .getObservableData('/task-project/' + this.projectId)
      .pipe(
        map((r: ITaskProject) => {
          this.taskProject = r;
          this.projectPhasesRelations = this.taskProject.projectPhasesRelations;
          this.phases = this.projectPhasesRelations.map((relation: any) => {
            const phase = relation.phase;
            // sorted by task.orderId
            phase.tasks = phase.tasks.sort((a, b) => a.orderId - b.orderId);
            this.tasksList = this.tasksList.concat(phase.tasks);
            return phase;
          });

          this.projectPermissions = this.prepareProjectPermission(
            this.taskProject.taskProjectPermissions,
          );

          return this.phases;
          // return this.concatTaskPhase(this.phases, this.tasksList);
        }),
        finalize(() => this.isLoadingProject.set(false)),
      )
      .subscribe((_result: ITaskList[]) => {
        this.addTooltipToTask(this.phases);
        if (this.view) {
          const task = this.tasksList.find(
            (item) => item.id === +this.route.snapshot.params['task'],
          );
          this.createEditTask('edit', task);
        }
      });
    this.subscriptions$.add(projectData);
  }
  createEditPhase(phase: ITaskPhase = null) {
    const id = phase?.id;
    const dialogConfig = {
      width: '90%',
      data: {
        phase: phase,
        projectId: this.projectId,
        projectPhasesRelations: this.projectPhasesRelations,
      },
    };
    if (id) {
      dialogConfig.data.phase = this.phases.find((item) => item.id === id);
    }
    const dialogRef = this.dialog.open(
      TaskPhaseCreateEditComponent,
      dialogConfig,
    );
    dialogRef.afterClosed().subscribe((result) => {
      const dialogResult = result?.result;
      const action = result?.action;
      if (dialogResult) {
        if (action === 'create') {
          this.savePhase(dialogResult);
        } else if (action === 'edit') {
          this.updatePhase(dialogResult);
        }
      }
    });
  }
  savePhase(phase: ITaskPhase) {
    const savePhase: Subscription = this.taskListService
      .savePhase(phase)
      .subscribe((res: any) => {
        const phase = res.body;
        phase.tasks = [];
        this.phases = [phase, ...this.phases];
        const projectPhasesRelations = phase.projectPhasesRelations[0];
        projectPhasesRelations.phase = {
          id: phase.id,
          name: phase.name,
          tasks: [],
        };
        this.projectPhasesRelations = [
          ...this.projectPhasesRelations,
          projectPhasesRelations,
        ];
      });
    this.subscriptions$.add(savePhase);
  }
  updatePhase(phase: ITaskPhase) {
    const update: Subscription = this.taskListService
      .updatePhase(phase)
      .subscribe((res: any) => {
        const phase = res.body;
        this.phases = this.phases.map((item) => {
          if (item.id === phase.id) {
            item = phase;
          }
          return item;
        });
      });
    this.subscriptions$.add(update);
  }
  deletePhase(id: number) {
    const dialogRef = this.dialog.open(DeleteConfirmModalComponent, {
      width: '400px',
      data: { text: 'Do you want to delete this phase?' },
    });
    dialogRef.afterClosed().subscribe((res: boolean) => {
      if (res) {
        this.dataService
          .deleteData('/task-phase/', id)
          .subscribe((_result: any) => {
            this.phases = this.phases.filter((item) => item.id !== id);
            this.projectPhasesRelations = this.projectPhasesRelations.filter(
              (item) => item.phase.id !== id,
            );
          });
      }
    });
  }
  sortPhaseList(phase: ITaskPhase) {
    const dialogRef = this.dialog.open(TaskPhaseSortComponent, {
      width: '90%',
      data: {
        projectPhasesRelations: this.projectPhasesRelations,
        phaseId: phase.id,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      const updatedProject = result?.result;
      if (updatedProject) {
        updatedProject.id = this.projectId;
        this.dataService
          .updateData('/task-project/', this.projectId, updatedProject)
          .subscribe((res: HttpResponse<any>) => {
            const project: ITaskProject = res.body;

            const projectPhasesRelations = project.projectPhasesRelations;
            const newPhaseOrder = Object.fromEntries(
              projectPhasesRelations.map((item, index) => [
                item.phase.id,
                index,
              ]),
            );
            this.phases = this.phases.sort(
              (a, b) => newPhaseOrder[a.id] - newPhaseOrder[b.id],
            );
          });
      }
    });
  }
  createEditTask(type: string, task = null, phaseId: number = null) {
    const dialogConfig = {
      width: '90%',
      data: {
        projectMembers: this.projectPermissions,
        task: undefined,
        phaseId: undefined,
        projectId: undefined,
        phaseList: undefined,
        slackChannelAlert: undefined,
      },
    };
    if (type === 'edit') {
      dialogConfig.data.task = task;
      dialogConfig.data.phaseList = this.phases;
      dialogConfig.data.slackChannelAlert = this.phases[0]?.slackChannel;
    } else if (type === 'create') {
      dialogConfig.data.phaseId = phaseId;
      dialogConfig.data.projectId = this.projectId;
      dialogConfig.data.phaseList = this.phases;
      dialogConfig.data.slackChannelAlert = this.phases[0]?.slackChannel;
    }
    const dialogRef = this.dialog.open(TaskCreateEditComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((result) => {
      this.router.navigate([
        '/pages/tasks-list/' + this.projectId,
        { title: this.projectTitle },
      ]);
      const dialogResult = result?.result;
      const action = result?.action;
      if (dialogResult) {
        if (action === 'save') {
          this.saveTask(dialogResult);
        } else if (action === 'update') {
          this.updateTask(dialogResult);
        } else if (result.action === 'delete') {
          this.confirmDeleteDialog(dialogResult);
        }
      }
    });
  }
  saveTask(task: ITask) {
    task.url = this.router.url;
    task.actorUserId = this.authData.id;

    if (task.taskAttachments instanceof FormData) {
      const sendAttachments: Subscription = this.dataService
        .postData(
          '/tasks/upload-attachments?userId=' + this.authData.id,
          task.taskAttachments,
        )
        .subscribe((result: any) => {
          if (
            Array.isArray(task.previousTaskAttachments) &&
            Array.isArray(result.body)
          ) {
            task.taskAttachments = [
              ...task.previousTaskAttachments,
              ...result.body,
            ];
          } else {
            task.taskAttachments = result.body;
          }
          this.taskWebSocketService.sendMessage(TasksEvents.CREATE, task);
        });
      this.subscriptions$.add(sendAttachments);
    } else {
      this.taskWebSocketService.sendMessage(TasksEvents.CREATE, task);
    }
  }
  updateTask(task: ITask) {
    task.actorUserId = this.authData.id;

    if (task.taskAttachments instanceof FormData) {
      const sendAttachments: Subscription = this.dataService
        .postData(
          '/tasks/upload-attachments?userId=' + this.authData.id,
          task.taskAttachments,
        )
        .subscribe((result: any) => {
          if (
            Array.isArray(task.previousTaskAttachments) &&
            Array.isArray(result.body)
          ) {
            task.taskAttachments = [
              ...task.previousTaskAttachments,
              ...result.body,
            ];
          } else {
            task.taskAttachments = result.body;
          }
          this.taskWebSocketService.sendMessage(TasksEvents.UPDATE, task);
        });
      this.subscriptions$.add(sendAttachments);
    } else {
      this.taskWebSocketService.sendMessage(TasksEvents.UPDATE, task);
    }
  }
  updateTaskArray(tasks: ITask[]) {
    this.taskWebSocketService.sendMessage('multi-reordering', tasks);
  }
  concatTaskPhase(phases: ITaskList[], tasks: ITask) {
    const taskPhaseId = tasks.phaseId;
    return phases.map((list) => {
      if (typeof list.tasks === 'undefined') {
        list.tasks = [];
      }
      if (list.id === taskPhaseId) {
        list.tasks.push(tasks);
      }
      // tasks.forEach(task => {
      //   if (list.id === task.phaseId) {
      //     list.data.push(task);
      //   }
      // });
      return list;
      // elems.sort((a, b) => a.id - b.id);
    });
  }
  removeTaskFromList(id: number) {
    return this.phases.map((list) => {
      list.tasks.forEach((t: ITask, index: number) => {
        if (t.id === id) {
          list.tasks.splice(index, 1);
        }
      });
      return list;
    });
  }
  confirmDeleteDialog(task: ITask): void {
    const dialogRef = this.dialog.open(DeleteConfirmModalComponent, {
      width: '400px',
      data: { text: 'Do you want to delete this task?' },
    });
    dialogRef.afterClosed().subscribe((res: boolean) => {
      if (res) {
        this.taskWebSocketService.sendMessage(TasksEvents.DELETE, task.id);
      }
    });
  }
  prepareProjectPermission(data: IProjectPermission[]) {
    let permissions;
    if (data.length > 0) {
      permissions = data.map((item) => {
        const user = item.user;
        if (!user) return item;
        return { group: user.firstName + ' ' + user.lastName, value: user.id };
      });
    }
    return permissions;
  }
  addTooltipToTask(tasks: ITaskList[]) {
    return tasks.map((item) => {
      item.tasks = item.tasks.map((task) => {
        task.tooltipCreate = this.checkInterval(task.createdAt, 'created');
        task.tooltipUpdate = this.checkInterval(task.updatedAt, 'updated');
        task.viewDateCreate = this.checkInterval(task.createdAt);
        task.viewDateUpdate = this.checkInterval(task.updatedAt);
        if (task.estimate) {
          task.estimateUntilDay = this.checkInterval(
            task.estimate,
            'untilToday',
          );
          task.estimateViewDate = this.checkInterval(task.estimate, 'estimate');
          task.estimateColor = task.estimateUntilDay.includes('ago')
            ? 'warning'
            : 'success';
        }
        return task;
      });
      return item;
    });
  }

  checkInterval(lastSendReportDate: Date, type?: string): string {
    const date = new Date(lastSendReportDate);
    // date must be 2024-10-10 format
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthToString = month < 10 ? '0' + month : month;
    const day = date.getDate();
    const splitDate = `${year}-${monthToString}-${day}`;

    const today = new Date();
    const lastSendDate = new Date(splitDate);
    const timeDiff = today.getTime() - lastSendDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    if (type === 'created') {
      return 'Created ' + daysDiff + ' days ago';
    } else if (type === 'updated') {
      return 'Updated ' + daysDiff + ' days ago';
    } else if (type === 'phase') {
      return daysDiff + ' days in this phase';
    } else if (type === 'untilToday') {
      const untilTodayDiff = Math.abs(daysDiff);
      return untilTodayDiff + (timeDiff > 0 ? ' days ago' : ' days');
    } else if (type === 'estimate' && typeof splitDate === 'string') {
      return splitDate;
    }

    return daysDiff + 'd';
  }
  openTask(task: ITask) {
    this.globalTask = task;
  }
}
