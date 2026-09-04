import {
    Controller,
    Get, MaxFileSizeValidator,
    Param,
    ParseFilePipe,
    ParseIntPipe,
    Post, Query,
    UploadedFiles,
    UseInterceptors
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Tasks } from './entities/task.entity';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FilesExtensionValidatorPipe } from '../../common/pipes/files-extension-validator.pipe';
import { diskStorage } from 'multer';
import { Request } from 'express';
import { TaskAttachments } from './entities/task-attachments.entity';
import { AuditLogService, ITaskHistoryEntry } from '../audit-log/audit-log.service';

@Controller('tasks')
export class TasksController {
    constructor (
      private readonly tasksService: TasksService,
      private readonly auditLogService: AuditLogService,
    ) {}

    @Get()
    findAll (@User() user: Users): Promise<Tasks[]> {
        return this.tasksService.findAll(user);
    }

    @Get(':id')
    findOne (@User() user: Users, @Param('id', ParseIntPipe) id: number): Promise<Tasks> {
        return this.tasksService.findOneById(id, user);
    }

    @Get(':id/history')
    getHistory (@Param('id', ParseIntPipe) id: number): Promise<ITaskHistoryEntry[]> {
        return this.auditLogService.findTaskHistory(id);
    }
    @Post('/upload-attachments')
    @UseInterceptors(FilesInterceptor('attachments', 10, {
        storage: diskStorage({
            destination: './upload/attachments',
            filename: (req: Request, file: Express.Multer.File, cb) => {
                const userId = req.query.userId;
                const hashedName = Math.random().toString(36).substring(2);
                const fileName = `${userId}_${Date.now()}_${hashedName}`;
                cb(null, fileName);
            }
        })
    }
    ))
    async uploadFile (
      @User() user: Users,
      @UploadedFiles(
          new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 })] }), // 2MB
          new FilesExtensionValidatorPipe()
      ) files: Array<Express.Multer.File>,
      @Query('userId', ParseIntPipe) userId: number): Promise<TaskAttachments[]> {
        return await this.tasksService.uploadFiles(user, userId, files);
    }

}
