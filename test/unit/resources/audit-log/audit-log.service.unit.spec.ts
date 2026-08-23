import { TestBed } from '@automock/jest';
import { AuditLogService } from '../../../../src/resources/audit-log/audit-log.service';
import { AuditLogRepository } from '../../../../src/resources/audit-log/audit-log.repository';
import { AuditLog } from '../../../../src/resources/audit-log/entities/audit-log.entity';

describe('AuditLogService', () => {
    it('findRecent delegates to the repository with a 30-day / 1000-row bound, and no filters by default', async () => {
        const { unit, unitRef } = TestBed.create(AuditLogService).compile();
        const repository = unitRef.get(AuditLogRepository);
        const rows = [{ id: 1 }] as AuditLog[];
        repository.findRecent.mockResolvedValue(rows);

        const result = await unit.findRecent();

        expect(repository.findRecent).toHaveBeenCalledWith(30, 1000, {});
        expect(result).toBe(rows);
    });

    it('passes userId/resourceType filters through to the repository', async () => {
        const { unit, unitRef } = TestBed.create(AuditLogService).compile();
        const repository = unitRef.get(AuditLogRepository);
        repository.findRecent.mockResolvedValue([]);

        await unit.findRecent({ userId: 3, resourceType: 'Tasks' });

        expect(repository.findRecent).toHaveBeenCalledWith(30, 1000, { userId: 3, resourceType: 'Tasks' });
    });
});
