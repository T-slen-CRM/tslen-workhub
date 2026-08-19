import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ExternalTasksService } from './external-tasks.service';
import { CreateExternalTaskDto } from './dto/create-external-task.dto';
import { ListExternalTasksQueryDto } from './dto/list-external-tasks-query.dto';
import { Tasks } from '../tasks/entities/task.entity';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';
import { ApiTokenGuard } from '../api-tokens/guards/api-token.guard';
import { SkipAuth } from '../auth/decorators/public.guard';

@Controller('external/tasks')
@UseGuards(ApiTokenGuard)
@SkipAuth()
export class ExternalTasksController {
    constructor (private readonly externalTasksService: ExternalTasksService) {}

    @Get()
    findAll (@Query() query: ListExternalTasksQueryDto): Promise<Tasks[]> {
        return this.externalTasksService.list(query);
    }

    @Post()
    create (
        @Body() createExternalTaskDto: CreateExternalTaskDto,
        @User() user: Users,
    ): Promise<Tasks> {
        return this.externalTasksService.create(createExternalTaskDto, user);
    }
}
