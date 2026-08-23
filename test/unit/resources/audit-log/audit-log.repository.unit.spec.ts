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

    describe('findRecent', () => {
        it('queries rows within the given age window, ordered newest first, capped at the given limit', async () => {
            const find = jest.fn().mockResolvedValue([]);
            const repository = new AuditLogRepository({ find } as unknown as Repository<AuditLog>);

            await repository.findRecent(30, 1000);

            expect(find).toHaveBeenCalledWith(expect.objectContaining({
                order: { createdAt: 'DESC' },
                take: 1000,
            }));
        });
    });
});
