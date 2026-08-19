import { CompanyController } from '../../../../src/resources/company/company.controller';
import { TestBed } from '@automock/jest';
import { Company } from '../../../../src/resources/company/entities/company.entity';

describe('CompanyController', () => {
    let controller: CompanyController;

    const mockedCompany = { id: 1, name: 'test' } as Company;

    beforeEach(async () => {
        const { unit } = TestBed.create(CompanyController).compile();
        controller = unit;
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
    it('should call companyService.create', async () => {
        jest.spyOn(controller, 'create').mockResolvedValue(mockedCompany);
        const result = await controller.create(mockedCompany);
        expect(controller.create).toHaveBeenCalled();
        expect(result).toEqual(mockedCompany);
    });
    it('should call companyService.update', async () => {
        jest.spyOn(controller, 'update').mockResolvedValue(mockedCompany);
        const result = await controller.update(1, mockedCompany);
        expect(controller.update).toHaveBeenCalled();
        expect(result).toEqual(mockedCompany);
    });
});
