import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SlackService } from '../slack/slack.service';

@Injectable()
export class ErrorService {
    private readonly logger = new Logger(this.constructor.name);
    constructor (private readonly slackService: SlackService) {}
    async aggregateError (loggerMsg: string, slackMsg: string = null, throwError: IThrowErrorObject = null): Promise<void> {
        if (loggerMsg) this.logger.error(loggerMsg);
        if (slackMsg) {
            try {
                await this.slackService.sendError(slackMsg);
            } catch (e) {
                this.logger.error(`Failed to send error to Slack: ${e.message}`);
            }
        }
        if (throwError && throwError.method) {
            if (throwError.method === ErrorExceptionMethod.NotFound){
                throw new NotFoundException(throwError.message);
            }
            if (throwError.method === ErrorExceptionMethod.Unauthorized) {
                throw new UnauthorizedException(throwError.message);
            }
        }
    }
}
export enum ErrorExceptionMethod {
    NotFound = 'NotFound',
    Unauthorized = 'Unauthorized'
}
export interface IThrowErrorObject {
    method: ErrorExceptionMethod,
    message: string
}
