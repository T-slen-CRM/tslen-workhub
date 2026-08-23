import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, MoreThanOrEqual, Repository } from 'typeorm';
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

    findRecent (
        maxAgeDays: number,
        limit: number,
        filters: { userId?: number; resourceType?: string } = {}
    ): Promise<AuditLog[]> {
        const since = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
        return this.auditLogRepository.find({
            where: {
                createdAt: MoreThanOrEqual(since),
                ...(filters.userId !== undefined ? { userId: filters.userId } : {}),
                ...(filters.resourceType !== undefined ? { resourceType: filters.resourceType } : {}),
            },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
}
