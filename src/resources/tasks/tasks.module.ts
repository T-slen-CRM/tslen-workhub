import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tasks } from './entities/task.entity';
import { TasksRepository } from './tasks.repository';
import { SlackService } from '../../common/services/slack/slack.service';
import { TaskUserAssignmentRelation } from './entities/taskUserAssignment.entity';
import { TasksGateway } from './gateway/tasks.gateway';
import { JwtService } from '@nestjs/jwt/dist/jwt.service';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageModule } from '../../common/services/storage/storage.module';
import { UsersModule } from '../users/users.module';
import { TaskAttachments } from './entities/task-attachments.entity';
import { ErrorService } from '../../common/services/error/error.service';
import { TaskNotificationsModule } from './task-notifications.module';
import { TaskPhaseModule } from '../task-phase/task-phase.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthGuard } from '../auth/guards/auth.guard';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Tasks,
            TaskAttachments,
            TaskUserAssignmentRelation
        ]),
        MulterModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                dest: configService.get<string>('MULTER_DEST'),
            }),
            inject: [ConfigService],
        }),
        StorageModule,
        UsersModule,
        TaskNotificationsModule,
        TaskPhaseModule,
        AuditLogModule
    ],
    controllers: [TasksController],
    providers: [
        TasksService,
        TasksRepository,
        ErrorService,
        SlackService,
        TasksGateway,
        JwtService,
        AuthGuard,
    ],
    exports: [TasksService, TasksRepository, TasksGateway],
})
export class TasksModule {}
