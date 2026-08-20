import { Injectable } from '@nestjs/common';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { TasksRepository } from './tasks.repository';
import { Tasks } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UploadAbstractService } from '../../common/services/upload/upload.abstract.service';
import { UsersService } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { Users } from '../users/entities/users.entity';
import { TaskAttachments } from './entities/task-attachments.entity';
import { ErrorExceptionMethod, ErrorService } from '../../common/services/error/error.service';
import { TaskNotificationsService } from './task-notifications.service';
import { TaskPhaseRepository } from '../task-phase/task-phase.repository';

@Injectable()
export class TasksService extends BaseAbstractService<Tasks>{
    constructor (
    protected readonly repository: TasksRepository,
    protected readonly errorService: ErrorService,
    private readonly uploadService: UploadAbstractService,
    private readonly usersService: UsersService,
    private readonly usersRepository: UsersRepository,
    private readonly taskNotificationsService: TaskNotificationsService,
    private readonly taskPhaseRepository: TaskPhaseRepository
    ) {
        super(repository, errorService);
        this.currentRepository = repository;
    }

    async update (id: number, data: UpdateTaskDto): Promise<Tasks> {
        const before: Tasks = await this.currentRepository.findOne(id);
        const oldAssigneeIds = new Set((before?.taskUserAssignmentRelations ?? []).map(r => r.userId));
        const oldPhaseId = before?.phaseId ?? null;

        const updated = await super.update(id, data) as Tasks;

        const actor = data.actorUserId ? await this.usersRepository.findOne(data.actorUserId) : null;

        const newAssignees = (updated.taskUserAssignmentRelations ?? [])
            .filter(r => !oldAssigneeIds.has(r.userId))
            .map(r => r.user);
        if (newAssignees.length > 0) {
            await this.taskNotificationsService.notifyAssigned(updated, newAssignees, actor);
        }

        if (data.phaseId !== undefined && data.phaseId !== null && data.phaseId !== oldPhaseId) {
            const recipients = await this.collectTaskRecipients(updated);
            const [fromPhase, toPhase] = await Promise.all([
                oldPhaseId ? this.taskPhaseRepository.findOne(oldPhaseId) : null,
                this.taskPhaseRepository.findOne(data.phaseId),
            ]);
            await this.taskNotificationsService.notifyPhaseMoved(
                updated,
                fromPhase?.name ?? 'a previous phase',
                toPhase?.name ?? 'a new phase',
                recipients,
                actor,
            );
        }

        return updated;
    }

    async collectTaskRecipients (task: Tasks): Promise<Users[]> {
        const assignees = (task.taskUserAssignmentRelations ?? []).map(r => r.user);
        const authorId = task.createdBy ? Number(task.createdBy) : null;
        if (authorId && !assignees.some(u => u.id === authorId)) {
            const author = await this.usersRepository.findOne(authorId);
            if (author) {
                assignees.push(author);
            }
        }
        return assignees;
    }

    async multiReordering (tasks: CreateTaskDto[]): Promise<Tasks[]> {
        return await this.currentRepository.multiReordering(tasks);
    }
    public async uploadFiles (user: Users, userId: number, files: Express.Multer.File[]): Promise<TaskAttachments[]> {
        try {
            this.usersService.validateUserIdByRole(userId, user);
            const result = [];
            for (const file of files) {
                if (!file) {
                    const errorMessage = `uploadFiles: ${this.constructor.name}. Message: File is empty`;
                    const throwError = { method: ErrorExceptionMethod.NotFound, message: `File is empty` };
                    await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
                }
                const imageUrl: string[] = await this.uploadService.uploadImage(file, 'taskAttachments/');
                const attachment = Object.assign(new TaskAttachments({}), {
                    url: imageUrl[0],
                    name: file.filename,
                    extension: file.mimetype,
                    originName: file.originalname,
                    type: file.mimetype
                });
                result.push(attachment);
            }
            return result;
        } catch (e) {
            const errorMessage = `uploadFiles: ${this.constructor.name}. Message: ${e.message}`;
            const throwError = { method: ErrorExceptionMethod.NotFound, message: `Cannot upload files` };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }
}
