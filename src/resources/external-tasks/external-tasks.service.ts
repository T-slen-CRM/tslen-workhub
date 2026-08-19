import { Injectable, NotFoundException } from '@nestjs/common';
import { TasksService } from '../tasks/tasks.service';
import { TasksRepository } from '../tasks/tasks.repository';
import { TaskPhaseRepository } from '../task-phase/task-phase.repository';
import { Tasks } from '../tasks/entities/task.entity';
import { Users } from '../users/entities/users.entity';
import { CreateExternalTaskDto } from './dto/create-external-task.dto';

@Injectable()
export class ExternalTasksService {
    constructor (
        private readonly tasksService: TasksService,
        private readonly tasksRepository: TasksRepository,
        private readonly taskPhaseRepository: TaskPhaseRepository,
    ) {}

    list (filters: { projectId?: number; phaseId?: number; status?: string }): Promise<Tasks[]> {
        return this.tasksRepository.findAllFiltered(filters);
    }

    async create (dto: CreateExternalTaskDto, user: Users): Promise<Tasks> {
        const phase = await this.taskPhaseRepository.findByIdWithProject(dto.phaseId);
        if (!phase) {
            throw new NotFoundException(`TaskPhase ${dto.phaseId} not found`);
        }
        if (!phase.taskProject) {
            throw new NotFoundException(`TaskPhase ${dto.phaseId} has no associated project`);
        }

        return this.tasksService.create({
            title: dto.title,
            description: dto.description ?? null,
            phaseId: dto.phaseId,
            projectId: phase.taskProject.id,
            priority: dto.priority ?? null,
            assignessEmail: dto.assigneeEmail ?? null,
            createdBy: String(user.id),
            createdByName: `${user.firstName} ${user.lastName}`,
        } as never);
    }
}
