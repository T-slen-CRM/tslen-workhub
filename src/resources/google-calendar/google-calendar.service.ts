import { Injectable } from '@nestjs/common';
import { DeleteResult } from 'typeorm';

import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { GoogleCalendar } from './entities/google-calendar.entity';
import { ErrorExceptionMethod, ErrorService, IThrowErrorObject } from '../../common/services/error/error.service';
import { GoogleCalendarRepository } from './google-calendar.repository';
import { GoogleService } from '../../common/services/google/google.service';
import { Users } from '../users/entities/users.entity';
import { EventsByUser } from '../events-by-user/entities/events-by-user.entity';
import { Role } from '@tslen-workhub/shared';

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
    async remove (id: number, user: Users): Promise<DeleteResult> {
        const entity: GoogleCalendar = await this.repository.findOne(id);
        if (!entity) {
            const errorMessage = `remove. Class: ${this.constructor.name} Message: Cannot find an entity for ${id}`;
            const throwError: IThrowErrorObject = { method: ErrorExceptionMethod.NotFound, message: `Cannot find an entity for ${id}` };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
        const isOwner = entity.userId === user.id;
        const isPrivileged = user.role === Role.Admin || user.role === Role.Manager;
        if (!isOwner && !isPrivileged) {
            const errorMessage = `remove. Class: ${this.constructor.name} Message: User ${user.id} is not allowed to remove google calendar ${id}`;
            const throwError: IThrowErrorObject = { method: ErrorExceptionMethod.Unauthorized, message: `Not allowed to remove this google calendar` };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
        return this.delete(id);
    }
}
