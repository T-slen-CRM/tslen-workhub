import { EntityManager, Repository } from 'typeorm';
import { EventsByUserRepository } from '../../../../src/resources/events-by-user/events-by-user.repository';
import { EventsByUser } from '../../../../src/resources/events-by-user/entities/events-by-user.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { DaysOffEntity } from '../../../../src/resources/company-days-off-rules/entities/days-off.entity';
import { mockUser } from '../../../shared/users';
import { activeUserCondition } from '../../../../src/resources/users/utils/active-user-condition.util';

/**
 * Minimal chainable stand-in for TypeORM's SelectQueryBuilder, recording
 * calls so tests can assert on where/andWhere arguments without a real DB.
 */
function createFakeQueryBuilder (result: unknown) {
    const calls: { method: string; args: unknown[] }[] = [];
    const qb: Record<string, (...args: unknown[]) => unknown> = {};
    ['select', 'where', 'andWhere', 'leftJoin', 'orderBy'].forEach((method) => {
        qb[method] = (...args: unknown[]) => { calls.push({ method, args }); return qb; };
    });
    qb.getQuery = () => '';
    qb.getRawMany = async () => result;
    return { qb, calls };
}

describe('EventsByUserRepository', () => {
    function setup () {
        const ebuCalls: { method: string; args: unknown[] }[] = [];
        const usersCalls: { method: string; args: unknown[] }[] = [];
        const { qb: ebuQb, calls: ebuQbCalls } = createFakeQueryBuilder([]);
        const { qb: usersQb, calls: usersQbCalls } = createFakeQueryBuilder([]);
        const fakeEventsByUserRepository = { createQueryBuilder: () => ebuQb } as unknown as Repository<EventsByUser>;
        const fakeUsersRepository = { createQueryBuilder: () => usersQb } as unknown as Repository<Users>;
        const fakeEntityManager = { query: jest.fn().mockResolvedValue([]) } as unknown as EntityManager;
        const fakeDaysOffRepository = {} as Repository<DaysOffEntity>;
        const repository = new EventsByUserRepository(
            fakeEventsByUserRepository,
            fakeEntityManager,
            fakeUsersRepository,
            fakeDaysOffRepository,
        );
        return { repository, ebuQbCalls, usersQbCalls, fakeEntityManager, ebuCalls, usersCalls };
    }

    describe('getEventsByMonth', () => {
        it('excludes inactive/fired users from both the events sub-query and the all-users sub-query', async () => {
            const { repository, ebuQbCalls, usersQbCalls } = setup();

            await repository.getEventsByMonth(mockUser as unknown as Users, {
                startDate: new Date('2026-06-01T00:00:00.000Z'),
                endDate: new Date('2026-06-30T00:00:00.000Z'),
            });

            expect(ebuQbCalls.find((c) => c.method === 'andWhere' && c.args[0] === activeUserCondition('u'))).toBeDefined();
            expect(usersQbCalls.find((c) => c.method === 'andWhere' && c.args[0] === activeUserCondition('u'))).toBeDefined();
        });
    });

    describe('getAbsentToday', () => {
        it('excludes inactive/fired users', async () => {
            const { repository, ebuQbCalls } = setup();

            await repository.getAbsentToday(mockUser as unknown as Users);

            expect(ebuQbCalls.find((c) => c.method === 'andWhere' && c.args[0] === activeUserCondition('u'))).toBeDefined();
        });
    });

    describe('getPending', () => {
        it('excludes inactive/fired users', async () => {
            const { repository, ebuQbCalls } = setup();

            await repository.getPending(mockUser as unknown as Users);

            expect(ebuQbCalls.find((c) => c.method === 'andWhere' && c.args[0] === activeUserCondition('user'))).toBeDefined();
        });
    });
});
