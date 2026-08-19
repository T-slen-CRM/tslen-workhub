import { Injectable } from '@nestjs/common';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { TaskProject } from './entities/task-project.entity';
import { TaskProjectRepository } from './task-project.repository';
import { ErrorService } from '../../common/services/error/error.service';

@Injectable()
export class TaskProjectService extends BaseAbstractService<TaskProject>{
    constructor (
    protected readonly repository: TaskProjectRepository,
    protected readonly errorService: ErrorService
    ) {
        super(repository, errorService);
        this.currentRepository = repository;
    }
}
