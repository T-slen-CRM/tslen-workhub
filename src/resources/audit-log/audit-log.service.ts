import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLog } from './entities/audit-log.entity';

const MAX_AGE_DAYS = 30;
const MAX_ROWS = 1000;

@Injectable()
export class AuditLogService {
    constructor (private readonly auditLogRepository: AuditLogRepository) {}

    findRecent (): Promise<AuditLog[]> {
        return this.auditLogRepository.findRecent(MAX_AGE_DAYS, MAX_ROWS);
    }
}
