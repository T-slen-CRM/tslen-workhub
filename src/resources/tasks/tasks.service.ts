import { Injectable } from '@nestjs/common';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { TasksRepository } from './tasks.repository';
import { Tasks } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UploadAbstractService } from '../../common/services/upload/upload.abstract.service';
import { UsersService } from '../users/users.service';
import { Users } from '../users/entities/users.entity';
import { TaskAttachments } from './entities/task-attachments.entity';
import { ErrorExceptionMethod, ErrorService } from '../../common/services/error/error.service';

@Injectable()
export class TasksService extends BaseAbstractService<Tasks>{
    constructor (
    protected readonly repository: TasksRepository,
    protected readonly errorService: ErrorService,
    private readonly uploadService: UploadAbstractService,
    private readonly usersService: UsersService
    ) {
        super(repository, errorService);
        this.currentRepository = repository;
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
