import { Injectable } from '@nestjs/common';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { TaskPhase } from './entities/task-phase.entity';
import { TaskPhaseRepository } from './task-phase.repository';

@Injectable()
export class TaskPhaseService extends BaseAbstractService<TaskPhase> {
    constructor (
    protected readonly repository: TaskPhaseRepository
    ) {
        super(repository, null);
        this.currentRepository = repository;
    }
}
