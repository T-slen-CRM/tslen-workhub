import { Module } from '@nestjs/common';
import { ExternalTasksController } from './external-tasks.controller';
import { ExternalTasksService } from './external-tasks.service';
import { TasksModule } from '../tasks/tasks.module';
import { TaskPhaseModule } from '../task-phase/task-phase.module';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';

@Module({
    imports: [TasksModule, TaskPhaseModule, ApiTokensModule],
    controllers: [ExternalTasksController],
    providers: [ExternalTasksService],
})
export class ExternalTasksModule {}
