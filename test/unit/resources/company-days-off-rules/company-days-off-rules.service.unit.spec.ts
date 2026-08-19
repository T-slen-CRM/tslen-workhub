import { TestBed } from '@automock/jest';
import {
    CompanyDaysOffRulesService
} from '../../../../src/resources/company-days-off-rules/company-days-off-rules.service';

describe('CompanyDaysOffRulesService', () => {
    let service: CompanyDaysOffRulesService;

    beforeEach(async () => {
        const { unit } = TestBed.create(CompanyDaysOffRulesService).compile();
        service = unit;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
