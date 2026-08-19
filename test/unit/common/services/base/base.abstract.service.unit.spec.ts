import { NotFoundException } from '@nestjs/common';
import { BaseAbstractService } from '../../../../../src/common/services/base/base.abstract.service';
import { ErrorService } from '../../../../../src/common/services/error/error.service';

class FakeRepository {
    createOneWithRelations = jest.fn();
}

class TestService extends BaseAbstractService<any> {
    constructor (repository: FakeRepository, errorService: ErrorService) {
        super(repository as never, errorService);
        this.currentRepository = repository;
    }
}

describe('BaseAbstractService.create', () => {
    it('formats a repository failure as a NotFoundException instead of letting it escape raw', async () => {
        const repository = new FakeRepository();
        repository.createOneWithRelations.mockRejectedValue(new Error('db failure'));
        const errorService = {
            aggregateError: jest.fn().mockImplementation(async (_logMsg, _slackMsg, throwError) => {
                throw new NotFoundException(throwError.message);
            }),
        } as unknown as ErrorService;
        const service = new TestService(repository, errorService);

        await expect(service.create({ title: 'x' })).rejects.toThrow(NotFoundException);
        expect(errorService.aggregateError).toHaveBeenCalled();
    });
});
