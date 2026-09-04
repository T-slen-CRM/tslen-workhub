import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, MoreThanOrEqual, Repository } from 'typeorm';
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
        filters: { userIds?: number[]; resourceTypes?: string[] } = {}
    ): Promise<AuditLog[]> {
        const since = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
        return this.auditLogRepository.find({
            where: {
                createdAt: MoreThanOrEqual(since),
                ...(filters.userIds && filters.userIds.length > 0 ? { userId: In(filters.userIds) } : {}),
                ...(filters.resourceTypes && filters.resourceTypes.length > 0 ? { resourceType: In(filters.resourceTypes) } : {}),
            },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    // A row's top-level resourceType/resourceId only capture the first
    // non-secondary entity touched by its request (see audit-log.middleware.ts) -
    // a bulk action can bury changes to this entity deeper in the `changes`
    // JSONB array, so this has to query into it rather than the top-level
    // columns to find every row that touched the given entity.
    findEntityChanges (entityName: string, entityId: number, limit = 200): Promise<AuditLog[]> {
        return this.auditLogRepository
            .createQueryBuilder('al')
            .where(
                `EXISTS (
                    SELECT 1 FROM jsonb_array_elements(al.changes) AS change
                    WHERE change->>'entityName' = :entityName
                      AND change->>'entityId' = :entityId
                )`,
                { entityName, entityId: String(entityId) },
            )
            .orderBy('al."createdAt"', 'DESC')
            .limit(limit)
            .getMany();
    }
}
