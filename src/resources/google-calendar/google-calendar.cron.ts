import { GoogleCalendar } from './entities/google-calendar.entity';
import { ConfigService } from '@nestjs/config';
import { GoogleService } from '../../common/services/google/google.service';
import { EventsByUser } from '../events-by-user/entities/events-by-user.entity';
import { ErrorExceptionMethod, ErrorService } from '../../common/services/error/error.service';
import { GoogleCalendarService } from './google-calendar.service';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class GoogleCalendarCron {
    constructor (
      private readonly googleCalendarService: GoogleCalendarService,
      private readonly errorService: ErrorService
    ) {
    }
    // @Cron('*/36 5-20 * * *',
    @Cron('*/20 5-20 * * 1-5',
        {
            name: 'refreshGoogleCalendarEvents',
            timeZone: 'Europe/London'
        }
    ) //At every 30th minute past every hour from 5 through 20 on every day-of-week from Monday through Friday.
    async refreshGoogleCalendarEvents () {
        console.log('Google calendar refresh started!');
        try {
            const googleCalendarRepository = this.googleCalendarService.getRepository();
            const googleCalendarEntities: GoogleCalendar[] = await googleCalendarRepository.findAll();
            if (!googleCalendarEntities.length) {
                return;
            }
            for (const entity of googleCalendarEntities) {
                const userId = entity.userId;
                const calendarId = entity.calendarId;
                const configService = new ConfigService();
                const googleService = new GoogleService(configService);
                const authClient = await googleService.authorize(userId);
                const googleEvents: EventsByUser[] = await googleService.getCalendarEvents(userId, calendarId, authClient);
                await googleCalendarRepository.refreshGoogleCalendarEvents(calendarId, googleEvents);
            }
        } catch (e) {
            const errorMessage = 'Google calendar refresh failed! ' + JSON.stringify(e.message);
            console.log(errorMessage);
            const throwError = { method: ErrorExceptionMethod.NotFound, message: 'Google calendar refresh failed!' + JSON.stringify(e.message) };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }

}
