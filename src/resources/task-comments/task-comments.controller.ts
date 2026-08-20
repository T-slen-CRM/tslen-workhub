import { Body, Controller, Get, ParseIntPipe, Post, Query } from '@nestjs/common';
import { TaskCommentsService } from './task-comments.service';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { TaskComment } from '../tasks/entities/task-comment.entity';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';
import { TasksService } from '../tasks/tasks.service';
import { TaskNotificationsService } from '../tasks/task-notifications.service';
import { TasksGateway, TasksEvents } from '../tasks/gateway/tasks.gateway';

@Controller('task-comments')
export class TaskCommentsController {
    constructor (
        private readonly taskCommentsService: TaskCommentsService,
        private readonly tasksService: TasksService,
        private readonly taskNotificationsService: TaskNotificationsService,
        private readonly tasksGateway: TasksGateway,
    ) {}

    @Get()
    findAll (@Query('taskId', ParseIntPipe) taskId: number): Promise<TaskComment[]> {
        return this.taskCommentsService.findByTask(taskId);
    }

    @Post()
    async create (
        @Body() createTaskCommentDto: CreateTaskCommentDto,
        @User() user: Users,
    ): Promise<TaskComment> {
        const comment = await this.taskCommentsService.create({
            taskId: createTaskCommentDto.taskId,
            content: createTaskCommentDto.content,
            userId: user.id,
        });
        this.tasksGateway.broadcast(TasksEvents.COMMENT_CREATED, comment);
        const task = await this.tasksService.findOneById(createTaskCommentDto.taskId, null);
        if (task) {
            const recipients = await this.tasksService.collectTaskRecipients(task);
            await this.taskNotificationsService.notifyCommented(task, comment.content, user, recipients);
        }
        return comment;
    }
}
