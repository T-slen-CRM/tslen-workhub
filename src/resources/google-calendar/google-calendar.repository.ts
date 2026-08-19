import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { GoogleCalendar } from './entities/google-calendar.entity';
import { EntityManager, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { EventsByUser } from '../events-by-user/entities/events-by-user.entity';

export class GoogleCalendarRepository extends BaseAbstractRepository<GoogleCalendar> {
    constructor (
        @InjectRepository(GoogleCalendar)
        private readonly googleCalendarRepository: Repository<GoogleCalendar>,
        private entityManager: EntityManager,
    ) {
        super(googleCalendarRepository);
        this.currentRepository = googleCalendarRepository;
    }
    async authorize (data: {googleCalendarEntity: GoogleCalendar, googleEvents: EventsByUser[]}): Promise<GoogleCalendar> {
        const createGoogleCalendarDto = data.googleCalendarEntity;
        const calendarId = createGoogleCalendarDto.calendarId;
        return this.entityManager.transaction(async transactionalEntityManager => {
            // get existing events for this calendar that Google returned, matched by googleId
            const googleIds = data.googleEvents.map((event) => event.googleId).filter(Boolean);
            const eventByUserEntity = googleIds.length
                ? await transactionalEntityManager.find(EventsByUser, {
                    where: {
                        googleCalendarId: calendarId,
                        googleId: In(googleIds)
                    } })
                : [];
            // compare events from google calendar with events from db
            const googleEvents = data.googleEvents;
            const comparedEvents: EventsByUser[] = this.getCompareEvents(calendarId, googleEvents, eventByUserEntity);
            // insert or update events
            await transactionalEntityManager.save(comparedEvents);
            const googleCalendar = Object.assign(new GoogleCalendar({}), createGoogleCalendarDto);
            return await transactionalEntityManager.save(googleCalendar);
        });
    }
    async refreshGoogleCalendarEvents (calendarId: string, googleEvents: EventsByUser[]): Promise<void> {
        return this.entityManager.transaction(async transactionalEntityManager => {
            // get existing events for this calendar that Google returned, matched by googleId
            const googleIds = googleEvents.map((event) => event.googleId).filter(Boolean);
            const eventByUserEntity = googleIds.length
                ? await this.entityManager.find(EventsByUser, {
                    where: {
                        googleCalendarId: calendarId,
                        googleId: In(googleIds)
                    }
                })
                : [];
            // compare events from google calendar with events from db
            const comparedEvents: EventsByUser[] = this.getCompareEvents(calendarId, googleEvents, eventByUserEntity);
            // insert or update events
            await transactionalEntityManager.save(comparedEvents);
        });
    }
    getCompareEvents (calendarId: string, googleEvents: EventsByUser[], eventByUserEntity: EventsByUser[]): EventsByUser[] {
        const eventByUserObject = Object.fromEntries(eventByUserEntity.map((event) => [event.googleId, event]));
        return googleEvents.map((event: EventsByUser) => {
            const googleId = event.googleId;
            event.googleCalendarId = calendarId;
            if (eventByUserObject[googleId]) {
                delete event.id;
                return Object.assign(new EventsByUser({}), eventByUserObject[googleId], event);
            }
            return event;
        });
    }
}
