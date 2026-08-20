import { Injectable } from '@nestjs/common';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { EventsByUser } from './entities/events-by-user.entity';
import { Users } from '../users/entities/users.entity';
import { DatesRangeDto } from '../../common/dto/dates-range.dto';
import { EventsByUserRepository } from './events-by-user.repository';
import { ErrorExceptionMethod, ErrorService, IThrowErrorObject } from '../../common/services/error/error.service';
import { CreateEventsByUserDto } from './dto/create-events-by-user.dto';
import { GoogleService, IGoogleCalendarEvent } from '../../common/services/google/google.service';
import { DeleteResult } from 'typeorm';
import { UpdateEventsByUserDto } from './dto/update-events-by-user.dto';
import { MailService } from '../../common/services/mail/mail.service';
import { CryptoService } from '../../common/services/crypto/crypto.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EventsByUserService extends BaseAbstractService<EventsByUser> {

    constructor (
      protected readonly repository: EventsByUserRepository,
      protected errorService: ErrorService,
      private readonly googleService: GoogleService,
      private readonly mailService: MailService,
      private cryptoService: CryptoService,
      private configService: ConfigService,
    ) {
        super(repository, errorService);
        this.currentRepository = repository;
    }

    async getEventsByMonth (user: Users, date: DatesRangeDto): Promise<EventsByUser[]> {
        try {
            return await this.currentRepository.getEventsByMonth(user, date);
        } catch (err) {
            const errorMessage = `getEventsByMonth: ${user.id}, class: ${this.constructor.name}. Message: ${err.message}`;
            const throwError: IThrowErrorObject = {
                method: ErrorExceptionMethod.NotFound,
                message: `Cannot get events by month for user: ${user.id}`
            };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }

    async getAbsentToday (user: Users): Promise<EventsByUser[]> {
        try {
            return await this.currentRepository.getAbsentToday(user);
        } catch (err) {
            const errorMessage = `getAbsentToday: ${user.id}, class: ${this.constructor.name}. Message: ${err.message}`;
            const throwError: IThrowErrorObject = {
                method: ErrorExceptionMethod.NotFound,
                message: `Cannot get absent today for user: ${user.id}`
            };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }

    async getPending (user: Users): Promise<EventsByUser[]> {
        try {
            return await this.currentRepository.getPending(user);
        } catch (err) {
            const errorMessage = `getPending: ${user.id}, class: ${this.constructor.name}. Message: ${err.message}`;
            const throwError: IThrowErrorObject = {
                method: ErrorExceptionMethod.NotFound,
                message: `Cannot get pending for user: ${user.id}`
            };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }

    async create (createEventsByUserDto: CreateEventsByUserDto, user: Users): Promise<EventsByUser> {
        try {
            createEventsByUserDto.secretToken = await this.generateSecretToken(user.id);
            // google integration
            if (createEventsByUserDto.isGoogleEvent && createEventsByUserDto.googleCalendarId) {
                const savedGoogleEvent: IGoogleCalendarEvent = await this.googleService.createCalendarEvent(createEventsByUserDto, user.id);
                createEventsByUserDto.googleId = savedGoogleEvent ? savedGoogleEvent.id : null;
                createEventsByUserDto.googleMeetLink = savedGoogleEvent ? savedGoogleEvent.hangoutLink : null;
            }
            // save event after saving google event
            const {
                event,
                userChiefEmails
            } = await this.currentRepository.createOneWithRelations(createEventsByUserDto, user);
            if (createEventsByUserDto.isRequest
              && createEventsByUserDto.approved === 0
              && userChiefEmails.length > 0) {
                const backEndDomain = this.configService.get('BACKEND_DOMAIN');
                const link = {
                    approve: `${backEndDomain}/api/v1/events-by-user/approve/${event.secretToken}`,
                    disapprove: `${backEndDomain}/api/v1/events-by-user/disapprove/${event.secretToken}`
                };
                await this.mailService.sendMail({
                    to: userChiefEmails,
                    subject: 'Request for approval',
                    template: './approve.request.hbs',
                    context: { event, user, link },
                });
            }
            return event;
        } catch (err) {
            const errorMessage = `create: ${user.id}, class: ${this.constructor.name}. Message: ${err.message}`;
            const throwError: IThrowErrorObject = {
                method: ErrorExceptionMethod.NotFound,
                message: `Cannot create event for user: ${user.id}`
            };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }

    async update (id: number, updateEventsByUserDto: UpdateEventsByUserDto): Promise<EventsByUser> {
        try {
            const entity: EventsByUser = await this.currentRepository.findOne(id);
            const entityData: EventsByUser = Object.assign(entity, updateEventsByUserDto);
            const googleId: string = entity.googleId;
            if (googleId) {
                await this.googleService.updateCalendarEvent(entityData as unknown as UpdateEventsByUserDto, entityData.userId);
            }
            return this.currentRepository.updateOneWithRelations(entityData);
        } catch (e) {
            const errorMessage = `update. Class: ${this.constructor.name} Message: ${e.message}`;
            const throwError: IThrowErrorObject = { method: ErrorExceptionMethod.NotFound, message: `Cannot update the entity.` };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }

    async delete (id: number): Promise<DeleteResult> {
        const entity: EventsByUser = await this.currentRepository.findOne(id);
        const calendarId: string = entity.googleCalendarId;
        const googleId: string = entity.googleId;
        const userId: number = entity.userId;
        await this.googleService.deleteCalendarEvent(calendarId, googleId, userId);
        return this.currentRepository.deleteOneWithRelations(id, entity);
    }

    async generateSecretToken (userId: number): Promise<string> {
        const value = `${userId}${Date.now()}`;
        const token = await this.cryptoService.encrypt(value);
        //remove special characters
        return token.replace(/[^\w\s]/gi, '');
    }

    async approveDisapproveEvent (token: string, status: number): Promise<{status: string}> {
        try {
            const { event, user } = await this.currentRepository.approveDisapproveEvent(token, status);
            // send email to user
            await this.mailService.sendMail({
                to: user.email,
                subject: 'Request status',
                template: './approve.answer.hbs',
                context: { event, user },
            });
            return { status: 'ok' };
        } catch (err) {
            const errorMessage = `approveEvent: ${token}, class: ${this.constructor.name}. Message: ${err.message}`;
            const throwError: IThrowErrorObject = {
                method: ErrorExceptionMethod.NotFound,
                message: `Cannot approve event for user: ${token}`
            };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }
}
