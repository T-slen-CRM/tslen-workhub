import { Module } from '@nestjs/common';
import { ExternalTasksController } from './external-tasks.controller';
import { ExternalProjectsController } from './external-projects.controller';
import { ExternalTasksService } from './external-tasks.service';
import { TasksModule } from '../tasks/tasks.module';
import { TaskPhaseModule } from '../task-phase/task-phase.module';
import { TaskProjectModule } from '../task-project/task-project.module';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';

@Module({
    imports: [TasksModule, TaskPhaseModule, TaskProjectModule, ApiTokensModule],
    controllers: [ExternalTasksController, ExternalProjectsController],
    providers: [ExternalTasksService],
})
export class ExternalTasksModule {}
