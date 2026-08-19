import {
    ErrorExceptionMethod,
    ErrorService,
    IThrowErrorObject
} from '../../../../src/common/services/error/error.service';
import { TestBed } from '@automock/jest';

describe('ErrorService', () => {
    let service: ErrorService;
    beforeEach(async () => {
        const { unit } = TestBed.create(ErrorService).compile();
        service = unit;
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should call aggregateError', async () => {
        const loggerMsg = 'test';
        const slackMsg = 'test';
        const throwError: IThrowErrorObject = {
            method: ErrorExceptionMethod.NotFound,
            message: 'test'
        };
        jest.spyOn(service, 'aggregateError').mockResolvedValue();
        await service.aggregateError(loggerMsg, slackMsg, throwError);
        expect(service.aggregateError).toBeCalledTimes(1);
    });
});
