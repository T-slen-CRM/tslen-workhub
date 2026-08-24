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
        expect(service.findRecent).toHaveBeenCalledWith({ userIds: undefined, resourceTypes: undefined });
    });

    it('passes userIds/resourceTypes query params through to the service', async () => {
        const { unit, unitRef } = TestBed.create(AuditLogController).compile();
        const service = unitRef.get(AuditLogService);
        service.findRecent.mockResolvedValue([]);

        await unit.findRecent({ userIds: [3, 5], resourceTypes: ['Tasks'] });

        expect(service.findRecent).toHaveBeenCalledWith({ userIds: [3, 5], resourceTypes: ['Tasks'] });
    });
});
