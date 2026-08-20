import { Component, DestroyRef, OnInit, input, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { TaskWebSocketService } from '../../pages/tasks-list/taskWebSocket.service';
import { ITaskComment } from '../../interfaces/tasks';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-task-comments',
    imports: [CommonModule, FormsModule, DatePipe, TranslateModule],
    templateUrl: './task-comments.component.html',
    styleUrls: ['./task-comments.component.scss']
})
export class TaskCommentsComponent implements OnInit {
  taskId = input.required<number>();
  comments: ITaskComment[] = [];
  newCommentContent = '';

  private dataService = inject(DataService);
  private taskWebSocketService = inject(TaskWebSocketService);
  private destroyRef = inject(DestroyRef);

  ngOnInit (): void {
    this.dataService.getObservableData(`/task-comments?taskId=${this.taskId()}`)
      .subscribe((comments: ITaskComment[]) => {
        this.comments = comments;
      });

    // The task-detail card previously only ever fetched comments once, on open —
    // a comment from another user only appeared after closing and reopening it.
    this.taskWebSocketService.getMessages('comment-created')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((comment: ITaskComment) => {
        if (comment.taskId !== this.taskId()) {
          return;
        }
        this.addCommentIfNew(comment);
      });
  }

  postComment (): void {
    const content = this.newCommentContent.trim();
    if (!content) {
      return;
    }
    this.dataService.postData('/task-comments', { taskId: this.taskId(), content })
      .subscribe((response: any) => {
        // The broadcast reaches the sender's own socket too (it's a global emit with
        // no self-exclusion) and can arrive before this REST response does — dedupe
        // here the same way the live handler above does, or a fast-arriving broadcast
        // plus this unconditional append would show the sender their own comment twice.
        this.addCommentIfNew(response.body as ITaskComment);
        this.newCommentContent = '';
      });
  }

  private addCommentIfNew (comment: ITaskComment): void {
    if (this.comments.some((existing) => existing.id === comment.id)) {
      return;
    }
    this.comments = [...this.comments, comment];
  }
}
