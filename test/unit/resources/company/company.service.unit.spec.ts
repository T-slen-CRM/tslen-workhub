import { CompanyService } from '../../../../src/resources/company/company.service';
import { TestBed } from '@automock/jest';

describe('CompanyService', () => {
    let service: CompanyService;

    beforeEach(async () => {
        const { unit } = TestBed.create(CompanyService).compile();
        service = unit;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
