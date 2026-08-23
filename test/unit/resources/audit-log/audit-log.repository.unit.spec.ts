import { Repository } from 'typeorm';
import { AuditLogRepository } from '../../../../src/resources/audit-log/audit-log.repository';
import { AuditLog } from '../../../../src/resources/audit-log/entities/audit-log.entity';

describe('AuditLogRepository', () => {
    describe('insertMany', () => {
        it('inserts the given entries via a single call', async () => {
            const insert = jest.fn().mockResolvedValue({});
            const repository = new AuditLogRepository({ insert } as unknown as Repository<AuditLog>);

            await repository.insertMany([{ ip: '1.2.3.4', method: 'POST' }]);

            expect(insert).toHaveBeenCalledTimes(1);
            expect(insert).toHaveBeenCalledWith([{ ip: '1.2.3.4', method: 'POST' }]);
        });

        it('does nothing for an empty array, without calling insert', async () => {
            const insert = jest.fn();
            const repository = new AuditLogRepository({ insert } as unknown as Repository<AuditLog>);

            await repository.insertMany([]);

            expect(insert).not.toHaveBeenCalled();
        });
    });
});
