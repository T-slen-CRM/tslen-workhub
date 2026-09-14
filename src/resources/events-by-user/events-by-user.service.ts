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
import { MeetingLinksService } from '../meeting-links/meeting-links.service';
import { MeetingLink } from '../meeting-links/entities/meeting-link.entity';
import { decryptToken } from '../meeting-links/utils/token-cipher';
import { buildGoogleCalendarLink } from './utils/google-calendar-link.util';

const TSLEN_MEET_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class EventsByUserService extends BaseAbstractService<EventsByUser> {

    constructor (
      protected readonly repository: EventsByUserRepository,
      protected errorService: ErrorService,
      private readonly googleService: GoogleService,
      private readonly mailService: MailService,
      private cryptoService: CryptoService,
      private configService: ConfigService,
      private readonly meetingLinksService: MeetingLinksService,
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
            // tslen meet integration - mirrors the Google Meet block above,
            // always overwriting meetingLinkId from the server-side result
            // (or nulling it) rather than trusting whatever the client sent.
            let savedMeetingLink: { id: number; token: string; roomName: string; title: string | null; expiresAt: Date | null } | null = null;
            if (createEventsByUserDto.createTslenMeet) {
                const expiresAt = new Date(Date.now() + TSLEN_MEET_TTL_MS).toISOString();
                savedMeetingLink = await this.meetingLinksService.createLink(user, {
                    title: createEventsByUserDto.title,
                    expiresAt,
                });
                createEventsByUserDto.meetingLinkId = savedMeetingLink.id;
            } else {
                createEventsByUserDto.meetingLinkId = null;
            }
            // save event after saving google event
            const {
                event,
                userChiefEmails
            } = await this.currentRepository.createOneWithRelations(createEventsByUserDto, user);
            // createOneWithRelations's save() doesn't re-fetch relations, so
            // without this the frontend only sees the new link after a full
            // reload (GET /users/:id, whose query explicitly joins it) -
            // attach it here from the data we already have on hand.
            if (savedMeetingLink) {
                event.meetingLink = Object.assign(new MeetingLink(), {
                    id: savedMeetingLink.id,
                    roomName: savedMeetingLink.roomName,
                    title: savedMeetingLink.title,
                    expiresAt: savedMeetingLink.expiresAt,
                    revokedAt: null,
                });
            }
            // Google Calendar emails attendees on its own (native Calendar API
            // behavior) once an event has a googleCalendarId - a T-slen meet
            // has no such built-in notification, so this app sends its own
            // invite. Scoped to createTslenMeet only, not Google events, and
            // to create-time only (attendees added on a later edit don't
            // retroactively get an invite). Failure here must not fail event
            // creation - same resilience pattern as
            // TaskNotificationsService.deliver().
            if (savedMeetingLink && event.attendees?.length) {
                const joinUrl = `${this.configService.get('FRONT_DOMAIN')}/meet/${savedMeetingLink.token}`;
                try {
                    await this.mailService.sendMail({
                        to: event.attendees.map((attendee) => attendee.userEmail),
                        subject: 'You are invited to a T-slen meeting',
                        template: './tslen-meet-invite.hbs',
                        context: { event, joinUrl, googleCalendarLink: buildGoogleCalendarLink(event, joinUrl) },
                    });
                } catch (mailErr) {
                    const errorMessage = `create (tslen meet invite email): ${user.id}, class: ${this.constructor.name}. Message: ${mailErr.message}`;
                    await this.errorService.aggregateError(errorMessage, errorMessage);
                }
            }
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
            const previousStart = entity.start;
            const previousEnd = entity.end;
            const entityData: EventsByUser = Object.assign(entity, updateEventsByUserDto);
            const googleId: string = entity.googleId;
            if (googleId) {
                await this.googleService.updateCalendarEvent(entityData as unknown as UpdateEventsByUserDto, entityData.userId);
            }
            const updatedEvent = await this.currentRepository.updateOneWithRelations(entityData);
            const timeChanged = this.didTimeChange(updateEventsByUserDto.start, previousStart)
              || this.didTimeChange(updateEventsByUserDto.end, previousEnd);
            if (timeChanged && updatedEvent.meetingLinkId && updatedEvent.attendees?.length) {
                await this.notifyTslenMeetRescheduled(updatedEvent);
            }
            return updatedEvent;
        } catch (e) {
            const errorMessage = `update. Class: ${this.constructor.name} Message: ${e.message}`;
            const throwError: IThrowErrorObject = { method: ErrorExceptionMethod.NotFound, message: `Cannot update the entity.` };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }

    private didTimeChange (newValue: Date | undefined, previousValue: Date): boolean {
        return newValue !== undefined && new Date(newValue).getTime() !== new Date(previousValue).getTime();
    }

    // A T-slen meet has no built-in "event updated" notification the way
    // Google Calendar attendees get natively - mirrors the create-time
    // invite (see create()'s invite block), but only when start/end
    // actually moved, not on every unrelated edit (title, comment, etc.).
    // Failure here must not fail the update itself.
    private async notifyTslenMeetRescheduled (event: EventsByUser): Promise<void> {
        try {
            if (!event.meetingLink?.encryptedToken) {
                return;
            }
            const token = decryptToken(event.meetingLink.encryptedToken);
            const joinUrl = `${this.configService.get('FRONT_DOMAIN')}/meet/${token}`;
            await this.mailService.sendMail({
                to: event.attendees.map((attendee) => attendee.userEmail),
                subject: 'Your T-slen meeting time has changed',
                template: './tslen-meet-rescheduled.hbs',
                context: { event, joinUrl, googleCalendarLink: buildGoogleCalendarLink(event, joinUrl) },
            });
        } catch (e) {
            const errorMessage = `update (tslen meet reschedule email): event ${event.id}, class: ${this.constructor.name}. Message: ${e.message}`;
            await this.errorService.aggregateError(errorMessage, errorMessage);
        }
    }

    async delete (id: number): Promise<DeleteResult> {
        const entity: EventsByUser = await this.currentRepository.findOne(id);
        const calendarId: string = entity.googleCalendarId;
        const googleId: string = entity.googleId;
        const userId: number = entity.userId;
        await this.googleService.deleteCalendarEvent(calendarId, googleId, userId);
        if (entity.meetingLinkId) {
            await this.meetingLinksService.revoke(entity.meetingLinkId, userId);
        }
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
