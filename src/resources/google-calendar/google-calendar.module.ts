import { Module } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleCalendarController } from './google-calendar.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleCalendar } from './entities/google-calendar.entity';
import { GoogleCalendarRepository } from './google-calendar.repository';
import { ErrorService } from '../../common/services/error/error.service';
import { SlackService } from '../../common/services/slack/slack.service';
import { GoogleService } from '../../common/services/google/google.service';
import { GoogleModule } from '../../common/services/google/google.module';
import { GoogleCalendarCron } from './google-calendar.cron';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            GoogleCalendar
        ]),
        GoogleModule
    ],
    controllers: [GoogleCalendarController],
    providers: [
        GoogleCalendarService,
        GoogleCalendarRepository,
        ErrorService,
        SlackService,
        GoogleCalendarCron,
        {
            provide: 'GoogleService',
            useExisting: GoogleService
        }
    ],
})
export class GoogleCalendarModule {}
