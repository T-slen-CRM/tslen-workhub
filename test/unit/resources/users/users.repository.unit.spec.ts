import { EntityManager } from 'typeorm';
import {
    CompanyDaysOffRules
} from '../../../../src/resources/company-days-off-rules/entities/company-days-off-rules.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { UsersRepository } from '../../../../src/resources/users/users.repository';
import { TestBed } from '@automock/jest';
import { mockUser } from '../../../shared/users';
import { DaysOffEntity } from '../../../../src/resources/company-days-off-rules/entities/days-off.entity';

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
        const mockResponse: Partial<Users> = mockUser as Users;
        jest.spyOn(repository, 'getOneWithRelations').mockResolvedValue(mockResponse as Users);
        const result = await repository.getOneWithRelations(1, mockUser as Users);
        expect(repository.getOneWithRelations).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('should call getByRole', async () => {
        const mockResponse: Partial<Users>[] = [mockUser] as Users[];
        jest.spyOn(repository, 'getByRole').mockResolvedValue(mockResponse as Users[]);
        const result = await repository.getByRole(mockUser as Users);
        expect(repository.getByRole).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('should call createOneWithRelations', async () => {
        const user = new Users(mockUser as Partial<Users>);
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
        const mockResponse: Partial<Users>[] = [mockUser] as Users[];
        jest.spyOn(repository, 'getUsersWithRelationsByDateRange').mockResolvedValue(mockResponse as Users[]);
        const result = await repository.getUsersWithRelationsByDateRange(mockUser as Users, { startDate, endDate });
        expect(repository.getUsersWithRelationsByDateRange).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('should call getBirthdayAnniversary', async () => {
        const mockResponse: Partial<Users> = mockUser as Users;
        jest.spyOn(repository, 'getBirthdayAnniversary').mockResolvedValue(mockResponse as Users[]);
        const result = await repository.getBirthdayAnniversary(mockUser as Users);
        expect(repository.getBirthdayAnniversary).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
});
