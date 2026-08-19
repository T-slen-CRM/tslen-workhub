import { Injectable } from '@nestjs/common';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { TaskComment } from '../tasks/entities/task-comment.entity';
import { TaskCommentsRepository } from './task-comments.repository';

@Injectable()
export class TaskCommentsService extends BaseAbstractService<TaskComment> {
    constructor (
        protected readonly repository: TaskCommentsRepository
    ) {
        super(repository, null);
        this.currentRepository = repository;
    }

    findByTask (taskId: number): Promise<TaskComment[]> {
        return this.repository.findByTaskId(taskId);
    }
}
