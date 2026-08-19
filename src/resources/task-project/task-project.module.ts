import { Module } from '@nestjs/common';
import { TaskProjectService } from './task-project.service';
import { TaskProjectController } from './task-project.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskProject } from './entities/task-project.entity';
import { TaskProjectRepository } from './task-project.repository';
import { SlackService } from '../../common/services/slack/slack.service';
import { TaskProjectPermission } from './entities/task-project-permission.entity';
import { ProjectPhasesRelation } from './entities/project-phases-relation.entity';
import { TaskProjectSubscriber } from './subscribers/task-project.subscriber';
import { ErrorService } from '../../common/services/error/error.service';

@Module({
    imports: [TypeOrmModule.forFeature([
        TaskProject,
        TaskProjectPermission,
        ProjectPhasesRelation
    ])],
    controllers: [TaskProjectController],
    providers: [
        TaskProjectService,
        TaskProjectRepository,
        ErrorService,
        SlackService,
        TaskProjectSubscriber
    ],
    exports: [TaskProjectRepository]
})
export class TaskProjectModule {}
