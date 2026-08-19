import { Component, OnInit, input, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
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

  ngOnInit (): void {
    this.dataService.getObservableData(`/task-comments?taskId=${this.taskId()}`)
      .subscribe((comments: ITaskComment[]) => {
        this.comments = comments;
      });
  }

  postComment (): void {
    const content = this.newCommentContent.trim();
    if (!content) {
      return;
    }
    this.dataService.postData('/task-comments', { taskId: this.taskId(), content })
      .subscribe((response: any) => {
        this.comments = [...this.comments, response.body as ITaskComment];
        this.newCommentContent = '';
      });
  }
}
