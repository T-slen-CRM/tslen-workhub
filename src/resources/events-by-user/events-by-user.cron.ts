import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { EventsByUserRepository } from './events-by-user.repository';
import { EventsByUser } from './entities/events-by-user.entity';
import { MailService } from '../../common/services/mail/mail.service';
import { ErrorService } from '../../common/services/error/error.service';
import { decryptToken } from '../meeting-links/utils/token-cipher';
import { buildGoogleCalendarLink } from './utils/google-calendar-link.util';

const REMINDER_LEAD_MS = 5 * 60 * 1000;
const REMINDER_WINDOW_MS = 60 * 1000;

// Every-minute sweep for T-slen meet events starting in ~5 minutes,
// mirroring GoogleCalendarCron's @Cron style (decorator cadence,
// isRunning reentrancy guard, per-item try/catch-and-continue,
// ErrorService.aggregateError for failures). A periodic sweep survives
// server restarts for free, unlike a one-off SchedulerRegistry.addTimeout
// per event, which this repo has no prior art or restart-recovery for.
@Injectable()
export class EventsByUserCron {
    private isRunning = false;
    private readonly logger = new Logger(EventsByUserCron.name);

    constructor (
      private readonly repository: EventsByUserRepository,
      private readonly mailService: MailService,
      private readonly configService: ConfigService,
      private readonly errorService: ErrorService,
    ) {}

    @Cron('* * * * *', { name: 'sendTslenMeetReminders' })
    async sendTslenMeetReminders (): Promise<void> {
        if (this.isRunning) {
            this.logger.log('T-slen meet reminder sweep already in progress, skipping this run!');
            return;
        }
        this.isRunning = true;
        try {
            // One tick ahead of "now" - each event crosses this 1-minute-wide
            // window on exactly one tick, so the reminder always fires
            // 4-5 minutes before start, never twice.
            const windowStart = new Date(Date.now() + REMINDER_LEAD_MS);
            const windowEnd = new Date(windowStart.getTime() + REMINDER_WINDOW_MS);
            const events = await this.repository.findUpcomingTslenMeetReminders(windowStart, windowEnd);
            for (const event of events) {
                await this.remindOne(event);
            }
        } catch (e) {
            const errorMessage = `T-slen meet reminder sweep failed! ${e.message}`;
            await this.errorService.aggregateError(errorMessage, errorMessage);
        } finally {
            this.isRunning = false;
        }
    }

    private async remindOne (event: EventsByUser): Promise<void> {
        try {
            if (event.attendees?.length && event.meetingLink?.encryptedToken) {
                const token = decryptToken(event.meetingLink.encryptedToken);
                const joinUrl = `${this.configService.get('FRONT_DOMAIN')}/meet/${token}`;
                await this.mailService.sendMail({
                    to: event.attendees.map((attendee) => attendee.userEmail),
                    subject: 'Your T-slen meeting starts in 5 minutes',
                    template: './tslen-meet-reminder.hbs',
                    context: { event, joinUrl, googleCalendarLink: buildGoogleCalendarLink(event, joinUrl) },
                });
            }
        } catch (e) {
            const errorMessage = `T-slen meet reminder failed for event ${event.id}! ${e.message}`;
            await this.errorService.aggregateError(errorMessage, errorMessage);
        } finally {
            // Marked sent even on failure (no attendees, undecryptable
            // token, or a mail error) - prevents a permanently-failing
            // event from being retried every tick indefinitely.
            await this.repository.markReminderSent(event.id);
        }
    }
}
