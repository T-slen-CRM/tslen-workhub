import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogBufferService } from './audit-log-buffer.service';
import { AuditLogMiddleware } from '../../common/middlewares/audit-log.middleware';
import { AuditLogWsInterceptor } from '../../common/interceptors/audit-log-ws.interceptor';
import { AuditLogSubscriber } from './audit-log.subscriber';
import { AuditLogLabelResolverService } from './audit-log-label-resolver.service';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { UsersModule } from '../users/users.module';
import { TaskPhaseModule } from '../task-phase/task-phase.module';
import { TaskProjectModule } from '../task-project/task-project.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([AuditLog]),
        UsersModule,
        TaskPhaseModule,
        TaskProjectModule,
    ],
    controllers: [AuditLogController],
    providers: [
        AuditLogRepository,
        AuditLogBufferService,
        AuditLogMiddleware,
        AuditLogLabelResolverService,
        AuditLogSubscriber,
        AuditLogService,
        AuditLogWsInterceptor,
    ],
    exports: [AuditLogMiddleware, AuditLogBufferService, AuditLogWsInterceptor],
})
export class AuditLogModule {}
