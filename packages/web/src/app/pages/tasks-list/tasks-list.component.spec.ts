import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { TasksListComponent } from './tasks-list.component';
import { DataService } from '../../services/data.service';
import { TaskWebSocketService } from './taskWebSocket.service';
import { AuthenticationService } from '../../services/auth.service';
import { TasksListService } from './service/tasks-list.service';
import { ITask, ITaskProject } from '../../interfaces/tasks';

describe('TasksListComponent', () => {
    let component: TasksListComponent;
    let fixture: ComponentFixture<TasksListComponent>;
    let taskWebSocketServiceSpy: jasmine.SpyObj<TaskWebSocketService>;
    let dataServiceSpy: jasmine.SpyObj<DataService>;

    beforeEach(async () => {
        taskWebSocketServiceSpy = jasmine.createSpyObj('TaskWebSocketService', ['sendMessage', 'getMessages']);
        taskWebSocketServiceSpy.getMessages.and.returnValue(new Subject<{ user: string; message: string }>().asObservable());
        dataServiceSpy = jasmine.createSpyObj('DataService', ['postData', 'getObservableData']);

        await TestBed.configureTestingModule({
            imports: [TasksListComponent, TranslateModule.forRoot()],
            providers: [
                { provide: DataService, useValue: dataServiceSpy },
                { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate'], { url: '/pages/tasks-list/1;title=Test%20Project' }) },
                { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
                { provide: ActivatedRoute, useValue: { params: of({}) } },
                { provide: TaskWebSocketService, useValue: taskWebSocketServiceSpy },
                {
                    provide: AuthenticationService,
                    useValue: { authDataSignal: () => ({ id: 42 }) },
                },
                { provide: TasksListService, useValue: {} },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(TasksListComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('stamps the current user id as actorUserId when saving a new task', () => {
        const task = { id: undefined, title: 'New task' } as ITask;

        component.saveTask(task);

        expect(taskWebSocketServiceSpy.sendMessage).toHaveBeenCalledWith('create', jasmine.objectContaining({ actorUserId: 42 }));
    });

    it('stamps the current user id as actorUserId when updating a task', () => {
        const task = { id: 7, title: 'Existing task' } as ITask;

        component.updateTask(task);

        expect(taskWebSocketServiceSpy.sendMessage).toHaveBeenCalledWith('update', jasmine.objectContaining({ actorUserId: 42 }));
    });

    it('sets isLoadingProject while the project fetch is in flight and clears it once it settles', () => {
        const subject = new Subject<ITaskProject>();
        dataServiceSpy.getObservableData.and.returnValue(subject.asObservable());

        component.ngOnInit();
        expect(component.isLoadingProject()).toBe(true);

        subject.next({ projectPhasesRelations: [], taskProjectPermissions: [] } as unknown as ITaskProject);
        subject.complete();

        expect(component.isLoadingProject()).toBe(false);
    });
});
