import { In, Repository } from 'typeorm';
import { AuditLogRepository } from '../../../../src/resources/audit-log/audit-log.repository';
import { AuditLog } from '../../../../src/resources/audit-log/entities/audit-log.entity';

/**
 * Minimal chainable stand-in for TypeORM's SelectQueryBuilder, recording
 * calls so tests can assert on the where condition/params without a real
 * DB - same technique used for UsersRepository.getOneWithRelations.
 */
function createFakeQueryBuilder (result: AuditLog[]) {
    const calls: { method: string; args: unknown[] }[] = [];
    const qb = {
        where (...args: unknown[]) { calls.push({ method: 'where', args }); return qb; },
        orderBy (...args: unknown[]) { calls.push({ method: 'orderBy', args }); return qb; },
        limit (...args: unknown[]) { calls.push({ method: 'limit', args }); return qb; },
        getMany: async () => result,
    };
    return { qb, calls };
}

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
            const where = find.mock.calls[0][0].where;
            expect(where.userId).toBeUndefined();
            expect(where.resourceType).toBeUndefined();
        });

        it('adds a userId IN(...) filter when given userIds, without requiring resourceTypes', async () => {
            const find = jest.fn().mockResolvedValue([]);
            const repository = new AuditLogRepository({ find } as unknown as Repository<AuditLog>);

            await repository.findRecent(30, 1000, { userIds: [3, 5] });

            expect(find.mock.calls[0][0].where).toEqual(expect.objectContaining({ userId: In([3, 5]) }));
        });

        it('adds a resourceType IN(...) filter when given resourceTypes, without requiring userIds', async () => {
            const find = jest.fn().mockResolvedValue([]);
            const repository = new AuditLogRepository({ find } as unknown as Repository<AuditLog>);

            await repository.findRecent(30, 1000, { resourceTypes: ['Tasks', 'Notification'] });

            expect(find.mock.calls[0][0].where).toEqual(expect.objectContaining({ resourceType: In(['Tasks', 'Notification']) }));
        });

        it('combines both filters when both are given', async () => {
            const find = jest.fn().mockResolvedValue([]);
            const repository = new AuditLogRepository({ find } as unknown as Repository<AuditLog>);

            await repository.findRecent(30, 1000, { userIds: [3], resourceTypes: ['Tasks'] });

            expect(find.mock.calls[0][0].where).toEqual(expect.objectContaining({ userId: In([3]), resourceType: In(['Tasks']) }));
        });

        it('omits the userId filter for an empty userIds array, rather than matching nothing', async () => {
            const find = jest.fn().mockResolvedValue([]);
            const repository = new AuditLogRepository({ find } as unknown as Repository<AuditLog>);

            await repository.findRecent(30, 1000, { userIds: [] });

            expect(find.mock.calls[0][0].where.userId).toBeUndefined();
        });
    });

    describe('findEntityChanges', () => {
        it('queries via a JSONB EXISTS condition on changes, ordered newest first, capped at the given limit', async () => {
            const rows = [{ id: 1 }] as AuditLog[];
            const { qb, calls } = createFakeQueryBuilder(rows);
            const createQueryBuilder = jest.fn().mockReturnValue(qb);
            const repository = new AuditLogRepository({ createQueryBuilder } as unknown as Repository<AuditLog>);

            const result = await repository.findEntityChanges('Tasks', 7, 200);

            expect(createQueryBuilder).toHaveBeenCalledWith('al');
            const whereCall = calls.find((c) => c.method === 'where');
            expect(whereCall.args[0]).toContain('jsonb_array_elements');
            expect(whereCall.args[1]).toEqual({ entityName: 'Tasks', entityId: '7' });
            expect(calls.find((c) => c.method === 'orderBy').args).toEqual(['al."createdAt"', 'DESC']);
            expect(calls.find((c) => c.method === 'limit').args).toEqual([200]);
            expect(result).toBe(rows);
        });

        it('defaults the limit to 200 when not given', async () => {
            const { qb, calls } = createFakeQueryBuilder([]);
            const createQueryBuilder = jest.fn().mockReturnValue(qb);
            const repository = new AuditLogRepository({ createQueryBuilder } as unknown as Repository<AuditLog>);

            await repository.findEntityChanges('Tasks', 7);

            expect(calls.find((c) => c.method === 'limit').args).toEqual([200]);
        });
    });
});
