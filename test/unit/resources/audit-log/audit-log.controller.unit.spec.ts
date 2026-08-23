import { TestBed } from '@automock/jest';
import { AuditLogController } from '../../../../src/resources/audit-log/audit-log.controller';
import { AuditLogService } from '../../../../src/resources/audit-log/audit-log.service';
import { AuditLog } from '../../../../src/resources/audit-log/entities/audit-log.entity';

describe('AuditLogController', () => {
    it('findRecent delegates to AuditLogService.findRecent with no filters when none are given', async () => {
        const { unit, unitRef } = TestBed.create(AuditLogController).compile();
        const service = unitRef.get(AuditLogService);
        const rows = [{ id: 1 }] as AuditLog[];
        service.findRecent.mockResolvedValue(rows);

        expect(await unit.findRecent({})).toBe(rows);
        expect(service.findRecent).toHaveBeenCalledWith({ userId: undefined, resourceType: undefined });
    });

    it('passes userId/resourceType query params through to the service', async () => {
        const { unit, unitRef } = TestBed.create(AuditLogController).compile();
        const service = unitRef.get(AuditLogService);
        service.findRecent.mockResolvedValue([]);

        await unit.findRecent({ userId: 3, resourceType: 'Tasks' });

        expect(service.findRecent).toHaveBeenCalledWith({ userId: 3, resourceType: 'Tasks' });
    });
});
