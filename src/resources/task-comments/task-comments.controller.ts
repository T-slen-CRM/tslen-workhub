import { Body, Controller, Get, ParseIntPipe, Post, Query } from '@nestjs/common';
import { TaskCommentsService } from './task-comments.service';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { TaskComment } from '../tasks/entities/task-comment.entity';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';

@Controller('task-comments')
export class TaskCommentsController {
    constructor (private readonly taskCommentsService: TaskCommentsService) {}

    @Get()
    findAll (@Query('taskId', ParseIntPipe) taskId: number): Promise<TaskComment[]> {
        return this.taskCommentsService.findByTask(taskId);
    }

    @Post()
    create (
        @Body() createTaskCommentDto: CreateTaskCommentDto,
        @User() user: Users,
    ): Promise<TaskComment> {
        return this.taskCommentsService.create({
            taskId: createTaskCommentDto.taskId,
            content: createTaskCommentDto.content,
            userId: user.id,
        });
    }
}
