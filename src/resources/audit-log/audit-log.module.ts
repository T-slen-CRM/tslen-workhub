import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogBufferService } from './audit-log-buffer.service';
import { AuditLogMiddleware } from '../../common/middlewares/audit-log.middleware';

@Module({
    imports: [TypeOrmModule.forFeature([AuditLog])],
    providers: [AuditLogRepository, AuditLogBufferService, AuditLogMiddleware],
    exports: [AuditLogMiddleware],
})
export class AuditLogModule {}
