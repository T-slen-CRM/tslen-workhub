import { Injectable } from '@nestjs/common';

import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { GoogleCalendar } from './entities/google-calendar.entity';
import { ErrorExceptionMethod, ErrorService } from '../../common/services/error/error.service';
import { GoogleCalendarRepository } from './google-calendar.repository';
import { GoogleService } from '../../common/services/google/google.service';
import { Users } from '../users/entities/users.entity';
import { EventsByUser } from '../events-by-user/entities/events-by-user.entity';

@Injectable()
export class GoogleCalendarService extends BaseAbstractService<GoogleCalendar>{
    constructor (
    protected readonly repository: GoogleCalendarRepository,
    protected readonly errorService: ErrorService,
    private readonly googleService: GoogleService
    ) {
        super(repository, errorService);
        this.currentRepository = repository;
    }
    async authorize (user: Users): Promise<GoogleCalendar> {
        try {
            const userId = user.id;
            const authClient = await this.googleService.authorize(userId);
            const { calendarId, timezone } = await this.googleService.getCalendarData(authClient);
            const googleCalendarEntity: GoogleCalendar = Object.assign(new GoogleCalendar({}), { userId, calendarId, timezone });
            const googleEvents: EventsByUser[] = await this.googleService.getCalendarEvents(userId, calendarId, authClient);
            return this.currentRepository.authorize({ googleCalendarEntity, googleEvents });
        } catch (e) {
            const errorMessage = 'Google calendar create failed! ' + JSON.stringify(e.message);
            const throwError = { method: ErrorExceptionMethod.NotFound, message: 'Google calendar create failed!' + JSON.stringify(e.message) };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }
    async createMeetingSpace (user: Users): Promise<{ uri: string }> {
        try {
            return await this.googleService.createMeetingSpace(user.id);
        } catch (e) {
            const errorMessage = 'Google calendar create meeting space failed! ' + JSON.stringify(e.message);
            const throwError = { method: ErrorExceptionMethod.NotFound, message: 'Google calendar create meeting space failed!' + JSON.stringify(e.message) };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }
    getRepository (): GoogleCalendarRepository {
        return this.currentRepository;
    }
}
export interface IGoogleCalendar {
    id: number;
    userId: number;
    calendarId: string;
    timezone: string;
}
