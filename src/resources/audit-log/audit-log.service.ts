import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLog } from './entities/audit-log.entity';
import { AuditEntityChange } from '../../common/audit-context.storage';
import { UsersRepository } from '../users/users.repository';
import { Users } from '../users/entities/users.entity';

const MAX_AGE_DAYS = 30;
const MAX_ROWS = 1000;

export interface ITaskHistoryEntry {
    id: string;
    createdAt: Date;
    action: 'insert' | 'update' | 'delete';
    field: string;
    from: unknown;
    fromLabel: string | null;
    to: unknown;
    toLabel: string | null;
    user: { id: number; firstName: string; lastName: string } | null;
}

@Injectable()
export class AuditLogService {
    constructor (
        private readonly auditLogRepository: AuditLogRepository,
        private readonly usersRepository: UsersRepository,
    ) {}

    findRecent (filters: { userIds?: number[]; resourceTypes?: string[] } = {}): Promise<AuditLog[]> {
        return this.auditLogRepository.findRecent(MAX_AGE_DAYS, MAX_ROWS, filters);
    }

    async findTaskHistory (taskId: number): Promise<ITaskHistoryEntry[]> {
        const rows = await this.auditLogRepository.findEntityChanges('Tasks', taskId);
        const userCache = new Map<number, Users | null>();
        const entries: ITaskHistoryEntry[] = [];
        for (const row of rows) {
            const taskChange = (row.changes as AuditEntityChange[] | null)
                ?.find((c) => c.entityName === 'Tasks' && String(c.entityId) === String(taskId));
            if (!taskChange) {
                continue;
            }
            let user: ITaskHistoryEntry['user'] = null;
            if (row.userId != null) {
                if (!userCache.has(row.userId)) {
                    userCache.set(row.userId, await this.usersRepository.findOne(row.userId));
                }
                const u = userCache.get(row.userId);
                user = u ? { id: u.id, firstName: u.firstName, lastName: u.lastName } : null;
            }
            for (const field of taskChange.fields) {
                entries.push({
                    id: `${row.id}:${field.field}`,
                    createdAt: row.createdAt,
                    action: taskChange.action,
                    field: field.field,
                    from: field.from ?? null,
                    fromLabel: field.fromLabel ?? null,
                    to: field.to ?? null,
                    toLabel: field.toLabel ?? null,
                    user,
                });
            }
        }
        return entries;
    }
}
