import { Injectable, NotFoundException } from '@nestjs/common';
import { TasksService } from '../tasks/tasks.service';
import { TasksRepository } from '../tasks/tasks.repository';
import { TaskPhaseRepository } from '../task-phase/task-phase.repository';
import { TaskProjectRepository } from '../task-project/task-project.repository';
import { UsersRepository } from '../users/users.repository';
import { Tasks } from '../tasks/entities/task.entity';
import { Users } from '../users/entities/users.entity';
import { CreateExternalTaskDto } from './dto/create-external-task.dto';

@Injectable()
export class ExternalTasksService {
    constructor (
        private readonly tasksService: TasksService,
        private readonly tasksRepository: TasksRepository,
        private readonly taskPhaseRepository: TaskPhaseRepository,
        private readonly taskProjectRepository: TaskProjectRepository,
        private readonly usersRepository: UsersRepository,
    ) {}

    list (filters: { projectId?: number; phaseId?: number; status?: string }): Promise<Tasks[]> {
        return this.tasksRepository.findAllFiltered(filters);
    }

    listProjects (): Promise<{ id: number; name: string; phases: { id: number; name: string }[] }[]> {
        return this.taskProjectRepository.findAllWithPhases();
    }

    async create (dto: CreateExternalTaskDto, user: Users): Promise<Tasks> {
        const phase = await this.taskPhaseRepository.findOne(dto.phaseId);
        if (!phase) {
            throw new NotFoundException(`TaskPhase ${dto.phaseId} not found`);
        }
        const project = await this.taskProjectRepository.findByPhaseId(dto.phaseId);
        if (!project) {
            throw new NotFoundException(`TaskPhase ${dto.phaseId} has no associated project`);
        }

        let assigneeUserId: number | undefined;
        if (dto.assigneeEmail) {
            const assignee = await this.usersRepository.findOneByCondition({ email: dto.assigneeEmail });
            if (!assignee) {
                throw new NotFoundException(`User with email ${dto.assigneeEmail} not found`);
            }
            assigneeUserId = assignee.id;
        }

        return this.tasksService.create({
            title: dto.title,
            description: dto.description ?? null,
            phaseId: dto.phaseId,
            projectId: project.id,
            priority: dto.priority ?? '',
            assignessEmail: dto.assigneeEmail ?? null,
            createdBy: String(user.id),
            createdByName: `${user.firstName} ${user.lastName}`,
            createdAt: new Date(),
            taskUserAssignmentRelations: assigneeUserId !== undefined ? [{ userId: assigneeUserId }] : undefined,
        } as never);
    }
}
