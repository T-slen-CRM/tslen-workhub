import { TestBed } from '@automock/jest';
import { Repository } from 'typeorm';
import {
    CompanyDaysOffRulesRepository
} from '../../../../src/resources/company-days-off-rules/company-days-off-rules.repository';
import {
    CompanyDaysOffRules
} from '../../../../src/resources/company-days-off-rules/entities/company-days-off-rules.entity';

/**
 * Minimal chainable stand-in for TypeORM's SelectQueryBuilder, recording
 * calls so tests can assert on where arguments without a real DB.
 */
function createFakeQueryBuilder (result: unknown) {
    const calls: { method: string; args: unknown[] }[] = [];
    const qb: Record<string, (...args: unknown[]) => unknown> = {};
    ['leftJoinAndSelect', 'where', 'andWhere'].forEach((method) => {
        qb[method] = (...args: unknown[]) => { calls.push({ method, args }); return qb; };
    });
    qb.getOne = async () => result;
    return { qb, calls };
}

describe('CompanyDaysOffRulesRepository', () => {
    let repository: CompanyDaysOffRulesRepository;
    const mockedCompanyDaysOffRules = { id: 1, companyId: 1, timeOff: 1 } as CompanyDaysOffRules;
    beforeEach(async () => {
        const { unit } = TestBed.create(CompanyDaysOffRulesRepository).compile();
        repository = unit;
    });
    it('should be defined', () => {
        expect(repository).toBeDefined();
    });
    it('should call getOneWithRelations', async () => {
        const mockResponse: Partial<CompanyDaysOffRules> = mockedCompanyDaysOffRules;
        jest.spyOn(repository, 'getOneWithRelations').mockResolvedValue(mockedCompanyDaysOffRules);
        const result = await repository.getOneWithRelations(1);
        expect(repository.getOneWithRelations).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('binds the company id as a query parameter instead of interpolating it into SQL (injection-safe)', async () => {
        const { qb, calls } = createFakeQueryBuilder(mockedCompanyDaysOffRules);
        const fakeRepository = { createQueryBuilder: () => qb } as unknown as Repository<CompanyDaysOffRules>;
        const testRepository = new CompanyDaysOffRulesRepository(fakeRepository);

        await testRepository.getOneWithRelations(42);

        const whereClause = calls.find(
            (c) => c.method === 'where' && String(c.args[0]).includes('companyId'),
        );
        expect(whereClause).toBeDefined();
        expect(String(whereClause.args[0])).toContain(':companyId');
        expect(String(whereClause.args[0])).not.toContain('42');
        expect(whereClause.args[1]).toEqual({ companyId: 42 });
    });
});
