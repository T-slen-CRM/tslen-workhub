import { TestBed } from '@automock/jest';
import { AuditLogController } from '../../../../src/resources/audit-log/audit-log.controller';
import { AuditLogService } from '../../../../src/resources/audit-log/audit-log.service';
import { AuditLog } from '../../../../src/resources/audit-log/entities/audit-log.entity';

describe('AuditLogController', () => {
    it('findRecent delegates to AuditLogService.findRecent', async () => {
        const { unit, unitRef } = TestBed.create(AuditLogController).compile();
        const service = unitRef.get(AuditLogService);
        const rows = [{ id: 1 }] as AuditLog[];
        service.findRecent.mockResolvedValue(rows);

        expect(await unit.findRecent()).toBe(rows);
    });
});
