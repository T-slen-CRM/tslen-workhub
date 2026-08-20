import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskCommentsService } from './task-comments.service';
import { TaskCommentsController } from './task-comments.controller';
import { TaskCommentsRepository } from './task-comments.repository';
import { TaskComment } from '../tasks/entities/task-comment.entity';
import { TasksModule } from '../tasks/tasks.module';
import { TaskNotificationsModule } from '../tasks/task-notifications.module';

@Module({
    imports: [TypeOrmModule.forFeature([TaskComment]), TasksModule, TaskNotificationsModule],
    controllers: [TaskCommentsController],
    providers: [
        TaskCommentsService,
        TaskCommentsRepository
    ],
})
export class TaskCommentsModule {}
