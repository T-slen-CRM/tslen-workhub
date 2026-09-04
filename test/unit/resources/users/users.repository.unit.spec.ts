import { EntityManager, Repository } from 'typeorm';
import {
    CompanyDaysOffRules
} from '../../../../src/resources/company-days-off-rules/entities/company-days-off-rules.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { UsersRepository } from '../../../../src/resources/users/users.repository';
import { TestBed } from '@automock/jest';
import { mockUser } from '../../../shared/users';
import { DaysOffEntity } from '../../../../src/resources/company-days-off-rules/entities/days-off.entity';
import { activeUserCondition } from '../../../../src/resources/users/utils/active-user-condition.util';

/**
 * Minimal chainable stand-in for the parts of TypeORM's SelectQueryBuilder
 * getUsersWithRelationsByDateRange/getBirthdayAnniversary use, recording
 * calls so tests can assert on where/andWhere/leftJoinAndSelect arguments
 * without a real DB.
 */
function createFakeListQueryBuilder (result: unknown) {
    const calls: { method: string; args: unknown[] }[] = [];
    const qb: Record<string, (...args: unknown[]) => unknown> = {};
    ['select', 'where', 'andWhere', 'leftJoinAndSelect', 'orderBy'].forEach((method) => {
        qb[method] = (...args: unknown[]) => { calls.push({ method, args }); return qb; };
    });
    qb.getMany = async () => result;
    qb.getQuery = () => '';
    return { qb, calls };
}

/**
 * Minimal in-memory stand-in for TypeORM's SelectQueryBuilder, recording
 * which `leftJoinAndSelect` calls getOneWithRelations makes so tests can
 * assert on the eventsByUsers join condition/params without a real DB -
 * same spirit as the FakeEntityManager in google-calendar.repository.unit.spec.ts,
 * adapted to the createQueryBuilder chain this method actually uses.
 */
function createFakeQueryBuilder (result: Partial<Users>) {
    const calls: { method: string; args: unknown[] }[] = [];
    const qb = {
        where (...args: unknown[]) { calls.push({ method: 'where', args }); return qb; },
        leftJoinAndSelect (...args: unknown[]) { calls.push({ method: 'leftJoinAndSelect', args }); return qb; },
        getOne: async () => result as Users,
    };
    return { qb, calls };
}

describe('UsersRepository', () => {
    let repository: UsersRepository;
    let entityManager: EntityManager;
    let companyDaysOffRulesRepository: {
        findOneBy: jest.Mock;
    };

    beforeEach(async () => {
        const { unit, unitRef } = TestBed.create(UsersRepository).compile();
        repository = unit;
        entityManager = unitRef.get(EntityManager);
    });
    it('should be defined', () => {
        expect(repository).toBeDefined();
    });
    it('should call getOneWithRelations', async () => {
        const mockResponse: Partial<Users> = mockUser as unknown as Users;
        jest.spyOn(repository, 'getOneWithRelations').mockResolvedValue(mockResponse as Users);
        const result = await repository.getOneWithRelations(1, mockUser as unknown as Users);
        expect(repository.getOneWithRelations).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('should call getByRole', async () => {
        const mockResponse: Partial<Users>[] = [mockUser] as unknown as Users[];
        jest.spyOn(repository, 'getByRole').mockResolvedValue(mockResponse as Users[]);
        const result = await repository.getByRole(mockUser as unknown as Users);
        expect(repository.getByRole).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('should call createOneWithRelations', async () => {
        const user = new Users(mockUser as unknown as Partial<Users>);
        const companyDaysOffRules = new CompanyDaysOffRules({
            companyId: user.companyId,
            hospital: 1,
            vocation: 1,
            timeOff: 1,
            transfer: 1,
            home: 1,
            useScheduler: 1,
        });
        const daysOff = new DaysOffEntity({
            hospital: 1,
            vocation: 1,
            timeOff: 1,
            transfer: 1,
            home: 1
        });
        await entityManager.transaction(async (transactionalEntityManager) => {
            const userResult = await transactionalEntityManager.save(user);
            expect(userResult).toEqual(mockUser);

            const companyDaysOffRulesResult = await companyDaysOffRulesRepository.findOneBy({ companyId: user.companyId });

            expect(companyDaysOffRulesResult).toEqual(companyDaysOffRules);
            const userDaysOff: DaysOffEntity = Object.assign(daysOff, companyDaysOffRulesResult);
            userDaysOff.userId = user.id;
            const userDaysOffResult = await transactionalEntityManager.save(userDaysOff);

            expect(userDaysOffResult).toEqual(daysOff);
        });
    });
    it('should call convertDateWithoutTimezoneOffset', async () => {
        const date = new Date('2021-01-01T00:00:00.000Z');
        const mockResponse = '2021-01-01 00:00:00';
        jest.spyOn(repository, 'convertDateWithoutTimezoneOffset').mockResolvedValue(mockResponse);
        const result = await repository.convertDateWithoutTimezoneOffset(date);
        expect(repository.convertDateWithoutTimezoneOffset).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('should call getUsersWithRelationsByDateRange', async () => {
        const startDate = new Date('2021-01-01T00:00:00.000Z');
        const endDate = new Date('2021-01-02T00:00:00.000Z');
        const mockResponse: Partial<Users>[] = [mockUser] as unknown as Users[];
        jest.spyOn(repository, 'getUsersWithRelationsByDateRange').mockResolvedValue(mockResponse as Users[]);
        const result = await repository.getUsersWithRelationsByDateRange(mockUser as unknown as Users, { startDate, endDate });
        expect(repository.getUsersWithRelationsByDateRange).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('excludes inactive/fired users from getUsersWithRelationsByDateRange', async () => {
        const { qb, calls } = createFakeListQueryBuilder([]);
        const fakeUsersOrmRepository = { createQueryBuilder: () => qb } as unknown as Repository<Users>;
        const testRepository = new UsersRepository(
            fakeUsersOrmRepository,
            {} as EntityManager,
            {} as Repository<CompanyDaysOffRules>,
        );
        const startDate = new Date('2026-06-01T00:00:00.000Z');
        const endDate = new Date('2026-06-30T00:00:00.000Z');

        await testRepository.getUsersWithRelationsByDateRange(mockUser as unknown as Users, { startDate, endDate });

        const activeCondition = calls.find((c) => c.method === 'andWhere' && c.args[0] === activeUserCondition('user'));
        expect(activeCondition).toBeDefined();
    });
    it('should call getBirthdayAnniversary', async () => {
        const mockResponse: Partial<Users> = mockUser as unknown as Users;
        jest.spyOn(repository, 'getBirthdayAnniversary').mockResolvedValue(mockResponse as Users[]);
        const result = await repository.getBirthdayAnniversary(mockUser as unknown as Users);
        expect(repository.getBirthdayAnniversary).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('excludes inactive/fired users from getBirthdayAnniversary, not just past lastDayInCompany', async () => {
        const calls: { method: string; args: unknown[] }[] = [];
        const qb: Record<string, (...args: unknown[]) => unknown> = {};
        ['select', 'where', 'andWhere'].forEach((method) => {
            qb[method] = (...args: unknown[]) => { calls.push({ method, args }); return qb; };
        });
        qb.getQuery = () => 'SELECT 1';
        const fakeUsersOrmRepository = { createQueryBuilder: () => qb } as unknown as Repository<Users>;
        const fakeEntityManager = { query: jest.fn().mockResolvedValue([]) } as unknown as EntityManager;
        const testRepository = new UsersRepository(
            fakeUsersOrmRepository,
            fakeEntityManager,
            {} as Repository<CompanyDaysOffRules>,
        );

        await testRepository.getBirthdayAnniversary(mockUser as unknown as Users);

        const activeConditionCalls = calls.filter((c) => c.method === 'andWhere' && c.args[0] === activeUserCondition('user'));
        expect(activeConditionCalls.length).toBe(2); // once for the birthday query, once for the anniversary query
    });

    describe('getOneWithRelations date filtering', () => {
        it('leaves the eventsByUsers join condition unchanged when no date range is given', async () => {
            const { qb, calls } = createFakeQueryBuilder({ ...mockUser, eventsByUsers: [] } as unknown as Users);
            const fakeUsersOrmRepository = { createQueryBuilder: () => qb } as unknown as Repository<Users>;
            const testRepository = new UsersRepository(
                fakeUsersOrmRepository,
                {} as EntityManager,
                {} as Repository<CompanyDaysOffRules>,
            );

            await testRepository.getOneWithRelations(1, mockUser as unknown as Users);

            const eventsJoinCall = calls.find((c) => c.method === 'leftJoinAndSelect' && c.args[1] === 'eventsByUsers');
            expect(eventsJoinCall.args[2]).toBe('eventsByUsers.approved != -1');
            expect(eventsJoinCall.args[3]).toBeUndefined();
        });

        it('scopes the eventsByUsers join to the given date range, normalizing endDate to end-of-day', async () => {
            const { qb, calls } = createFakeQueryBuilder({ ...mockUser, eventsByUsers: [] } as unknown as Users);
            const fakeUsersOrmRepository = { createQueryBuilder: () => qb } as unknown as Repository<Users>;
            const testRepository = new UsersRepository(
                fakeUsersOrmRepository,
                {} as EntityManager,
                {} as Repository<CompanyDaysOffRules>,
            );
            const startDate = new Date('2026-06-01T00:00:00.000Z');
            const endDate = new Date('2026-06-30T00:00:00.000Z');

            await testRepository.getOneWithRelations(1, mockUser as unknown as Users, { startDate, endDate });

            const eventsJoinCall = calls.find((c) => c.method === 'leftJoinAndSelect' && c.args[1] === 'eventsByUsers');
            expect(eventsJoinCall.args[2]).toBe(
                'eventsByUsers.approved != -1 AND (eventsByUsers.start BETWEEN :startDate AND :endDate OR eventsByUsers.end BETWEEN :startDate AND :endDate)',
            );
            expect(eventsJoinCall.args[3]).toEqual({
                startDate,
                endDate: new Date('2026-06-30T23:59:59.999Z'),
            });
        });
    });
});
