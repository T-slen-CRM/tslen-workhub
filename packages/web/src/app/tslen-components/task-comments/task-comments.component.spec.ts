import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { TaskCommentsComponent } from './task-comments.component';
import { DataService } from '../../services/data.service';
import { ITaskComment } from '../../interfaces/tasks';

describe('TaskCommentsComponent', () => {
  let component: TaskCommentsComponent;
  let fixture: ComponentFixture<TaskCommentsComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;

  const existingComment: ITaskComment = {
    id: 1,
    taskId: 5,
    content: 'first comment',
    createdAt: '2026-08-17T10:00:00.000Z',
    user: { id: 9, firstName: 'Jane', lastName: 'Doe' },
  };

  beforeEach(async () => {
    dataServiceSpy = jasmine.createSpyObj('DataService', ['getObservableData', 'postData']);
    dataServiceSpy.getObservableData.and.returnValue(of([existingComment]));

    await TestBed.configureTestingModule({
      imports: [TaskCommentsComponent, TranslateModule.forRoot()],
      providers: [{ provide: DataService, useValue: dataServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskCommentsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('taskId', 5);
  });

  it('loads existing comments for the task on init', () => {
    fixture.detectChanges();

    expect(dataServiceSpy.getObservableData).toHaveBeenCalledWith('/task-comments?taskId=5');
    expect(component.comments).toEqual([existingComment]);
  });

  it('posts a new comment and appends the server response to the list', () => {
    const created: ITaskComment = {
      id: 2,
      taskId: 5,
      content: 'new comment',
      createdAt: '2026-08-17T10:05:00.000Z',
      user: { id: 9, firstName: 'Jane', lastName: 'Doe' },
    };
    dataServiceSpy.postData.and.returnValue(of({ body: created }) as never);
    fixture.detectChanges();

    component.newCommentContent = 'new comment';
    component.postComment();

    expect(dataServiceSpy.postData).toHaveBeenCalledWith('/task-comments', { taskId: 5, content: 'new comment' });
    expect(component.comments).toEqual([existingComment, created]);
    expect(component.newCommentContent).toBe('');
  });

  it('does not post when content is empty or whitespace-only', () => {
    fixture.detectChanges();

    component.newCommentContent = '   ';
    component.postComment();

    expect(dataServiceSpy.postData).not.toHaveBeenCalled();
  });
});
