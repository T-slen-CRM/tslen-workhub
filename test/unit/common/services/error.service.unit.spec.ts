import {
    ErrorExceptionMethod,
    ErrorService,
    IThrowErrorObject
} from '../../../../src/common/services/error/error.service';
import { TestBed } from '@automock/jest';
import { SlackService } from '../../../../src/common/services/slack/slack.service';
import { NotFoundException } from '@nestjs/common';

describe('ErrorService', () => {
    let service: ErrorService;
    let slackService: jest.Mocked<SlackService>;
    beforeEach(async () => {
        const { unit, unitRef } = TestBed.create(ErrorService).compile();
        service = unit;
        slackService = unitRef.get(SlackService);
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
    it('still throws the configured exception when Slack notification fails', async () => {
        slackService.sendError.mockRejectedValue(new Error('legacy_custom_bots_deprecated'));
        const throwError: IThrowErrorObject = {
            method: ErrorExceptionMethod.NotFound,
            message: 'entity missing'
        };

        await expect(service.aggregateError('log msg', 'slack msg', throwError))
            .rejects.toBeInstanceOf(NotFoundException);
    });
});
