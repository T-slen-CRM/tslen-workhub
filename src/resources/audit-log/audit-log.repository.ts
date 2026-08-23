import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { AuditLog } from './entities/audit-log.entity';

export class AuditLogRepository extends BaseAbstractRepository<AuditLog> {
    constructor (
        @InjectRepository(AuditLog)
        private readonly auditLogRepository: Repository<AuditLog>
    ) {
        super(auditLogRepository);
    }

    async insertMany (entries: DeepPartial<AuditLog>[]): Promise<void> {
        if (entries.length === 0) {
            return;
        }
        await this.auditLogRepository.insert(entries);
    }
}
