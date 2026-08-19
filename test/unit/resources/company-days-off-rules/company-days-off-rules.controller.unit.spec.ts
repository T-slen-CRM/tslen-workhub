import { TestBed } from '@automock/jest';
import {
    CompanyDaysOffRulesController
} from '../../../../src/resources/company-days-off-rules/company-days-off-rules.controller';
import {
    CompanyDaysOffRules
} from '../../../../src/resources/company-days-off-rules/entities/company-days-off-rules.entity';
import { mockUser } from '../../../shared/users';
import { Users } from '../../../../src/resources/users/entities/users.entity';

describe('CompanyDaysOffRulesController', () => {
    let controller: CompanyDaysOffRulesController;

    const mockedCompanyDaysOffRules = { id: 1, companyId: 1, timeOff: 1 } as CompanyDaysOffRules;

    beforeEach(async () => {
        const { unit } = TestBed.create(CompanyDaysOffRulesController).compile();
        controller = unit;
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
    it('should findOeById', async () => {
        jest.spyOn(controller, 'findOneById').mockResolvedValue(mockedCompanyDaysOffRules);
        const result = await controller.findOneById(mockUser as Users);
        expect(controller.findOneById).toHaveBeenCalled();
        expect(result).toEqual(mockedCompanyDaysOffRules);
    });
    it('should update', async () => {
        jest.spyOn(controller, 'update').mockResolvedValue(mockedCompanyDaysOffRules);
        const result = await controller.update(1, mockedCompanyDaysOffRules);
        expect(controller.update).toHaveBeenCalled();
        expect(result).toEqual(mockedCompanyDaysOffRules);
    });

});
