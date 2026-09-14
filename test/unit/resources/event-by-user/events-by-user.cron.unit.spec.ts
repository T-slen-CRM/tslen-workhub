import { EventsByUserCron } from '../../../../src/resources/events-by-user/events-by-user.cron';
import { EventsByUserRepository } from '../../../../src/resources/events-by-user/events-by-user.repository';
import { MailService } from '../../../../src/common/services/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { ErrorService } from '../../../../src/common/services/error/error.service';
import { EventsByUser } from '../../../../src/resources/events-by-user/entities/events-by-user.entity';
import { encryptToken } from '../../../../src/resources/meeting-links/utils/token-cipher';
import { MeetingLink } from '../../../../src/resources/meeting-links/entities/meeting-link.entity';

describe('EventsByUserCron', () => {
    let cron: EventsByUserCron;
    let repository: { findUpcomingTslenMeetReminders: jest.Mock; markReminderSent: jest.Mock };
    let mailService: { sendMail: jest.Mock };
    let configService: { get: jest.Mock };
    let errorService: { aggregateError: jest.Mock };

    const originalEnv = process.env.MEETING_LINK_TOKEN_KEY;

    beforeAll(() => {
        process.env.MEETING_LINK_TOKEN_KEY = 'a'.repeat(64);
    });

    afterAll(() => {
        process.env.MEETING_LINK_TOKEN_KEY = originalEnv;
    });

    beforeEach(() => {
        repository = {
            findUpcomingTslenMeetReminders: jest.fn().mockResolvedValue([]),
            markReminderSent: jest.fn().mockResolvedValue(undefined),
        };
        mailService = { sendMail: jest.fn().mockResolvedValue(undefined) };
        configService = { get: jest.fn().mockReturnValue('https://crm.t-slen.com') };
        errorService = { aggregateError: jest.fn().mockResolvedValue(undefined) };
        cron = new EventsByUserCron(
            repository as unknown as EventsByUserRepository,
            mailService as unknown as MailService,
            configService as unknown as ConfigService,
            errorService as unknown as ErrorService,
        );
    });

    function makeEvent (overrides: Partial<EventsByUser> = {}): EventsByUser {
        return Object.assign(new EventsByUser({}), {
            id: 1,
            title: 'Standup',
            start: new Date('2026-09-10T09:00:00.000Z'),
            end: new Date('2026-09-10T09:30:00.000Z'),
            attendees: [{ userEmail: 'a@example.com' }],
            meetingLink: { encryptedToken: encryptToken('plaintext-token'), revokedAt: null } as MeetingLink,
            ...overrides,
        });
    }

    it('emails attendees the reminder with a decrypted join link, and marks the reminder sent', async () => {
        const event = makeEvent();
        repository.findUpcomingTslenMeetReminders.mockResolvedValue([event]);

        await cron.sendTslenMeetReminders();

        expect(mailService.sendMail).toHaveBeenCalledWith(expect.objectContaining({
            to: ['a@example.com'],
            template: './tslen-meet-reminder.hbs',
            context: expect.objectContaining({
                joinUrl: 'https://crm.t-slen.com/meet/plaintext-token',
                googleCalendarLink: expect.stringContaining('https://calendar.google.com/calendar/render?'),
            }),
        }));
        expect(repository.markReminderSent).toHaveBeenCalledWith(1);
    });

    it('marks the reminder sent without mailing when the event has no attendees', async () => {
        const event = makeEvent({ attendees: [] });
        repository.findUpcomingTslenMeetReminders.mockResolvedValue([event]);

        await cron.sendTslenMeetReminders();

        expect(mailService.sendMail).not.toHaveBeenCalled();
        expect(repository.markReminderSent).toHaveBeenCalledWith(1);
    });

    it('still marks the reminder sent when the mail send fails, to avoid retrying every tick', async () => {
        const event = makeEvent();
        repository.findUpcomingTslenMeetReminders.mockResolvedValue([event]);
        mailService.sendMail.mockRejectedValue(new Error('smtp down'));

        await cron.sendTslenMeetReminders();

        expect(repository.markReminderSent).toHaveBeenCalledWith(1);
        expect(errorService.aggregateError).toHaveBeenCalled();
    });

    it('continues to the next event when one event fails, and queries a ~5-minute-ahead window', async () => {
        const failing = makeEvent({ id: 1, meetingLink: { encryptedToken: 'not-valid-hex', revokedAt: null } as MeetingLink });
        const ok = makeEvent({ id: 2 });
        repository.findUpcomingTslenMeetReminders.mockResolvedValue([failing, ok]);

        await cron.sendTslenMeetReminders();

        expect(repository.markReminderSent).toHaveBeenCalledWith(1);
        expect(repository.markReminderSent).toHaveBeenCalledWith(2);
        expect(mailService.sendMail).toHaveBeenCalledTimes(1);

        const [windowStart, windowEnd] = repository.findUpcomingTslenMeetReminders.mock.calls[0];
        const leadMs = windowStart.getTime() - Date.now();
        expect(leadMs).toBeGreaterThan(4 * 60 * 1000);
        expect(leadMs).toBeLessThanOrEqual(5 * 60 * 1000 + 1000);
        expect(windowEnd.getTime() - windowStart.getTime()).toBe(60 * 1000);
    });

    it('skips a run that starts while a previous run is still in progress', async () => {
        let resolveFind: (value: EventsByUser[]) => void;
        repository.findUpcomingTslenMeetReminders.mockReturnValue(new Promise((resolve) => { resolveFind = resolve; }));

        const firstRun = cron.sendTslenMeetReminders();
        const secondRun = cron.sendTslenMeetReminders();

        resolveFind([]);
        await Promise.all([firstRun, secondRun]);

        expect(repository.findUpcomingTslenMeetReminders).toHaveBeenCalledTimes(1);
    });
});
