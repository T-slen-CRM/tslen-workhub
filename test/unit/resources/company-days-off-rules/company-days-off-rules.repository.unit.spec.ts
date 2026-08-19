import { TestBed } from '@automock/jest';
import {
    CompanyDaysOffRulesRepository
} from '../../../../src/resources/company-days-off-rules/company-days-off-rules.repository';
import {
    CompanyDaysOffRules
} from '../../../../src/resources/company-days-off-rules/entities/company-days-off-rules.entity';

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
});
