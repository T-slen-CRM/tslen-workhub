import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskCommentsService } from './task-comments.service';
import { TaskCommentsController } from './task-comments.controller';
import { TaskCommentsRepository } from './task-comments.repository';
import { TaskComment } from '../tasks/entities/task-comment.entity';

@Module({
    imports: [TypeOrmModule.forFeature([TaskComment])],
    controllers: [TaskCommentsController],
    providers: [
        TaskCommentsService,
        TaskCommentsRepository
    ],
})
export class TaskCommentsModule {}
