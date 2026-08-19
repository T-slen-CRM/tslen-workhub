import { GoogleCalendarCron } from '../../../../src/resources/google-calendar/google-calendar.cron';
import { ErrorService } from '../../../../src/common/services/error/error.service';
import { GoogleCalendarService } from '../../../../src/resources/google-calendar/google-calendar.service';
import { GoogleService } from '../../../../src/common/services/google/google.service';
import { GoogleCalendar } from '../../../../src/resources/google-calendar/entities/google-calendar.entity';

jest.mock('../../../../src/common/services/google/google.service');

describe('GoogleCalendarCron', () => {
    let cron: GoogleCalendarCron;
    let googleCalendarService: jest.Mocked<GoogleCalendarService>;
    let errorService: jest.Mocked<ErrorService>;
    let repository: { findAll: jest.Mock; refreshGoogleCalendarEvents: jest.Mock };

    beforeEach(() => {
        repository = {
            findAll: jest.fn(),
            refreshGoogleCalendarEvents: jest.fn().mockResolvedValue(undefined),
        };
        googleCalendarService = {
            getRepository: jest.fn().mockReturnValue(repository),
        } as unknown as jest.Mocked<GoogleCalendarService>;
        errorService = {
            aggregateError: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<ErrorService>;
        cron = new GoogleCalendarCron(googleCalendarService, errorService);
        (GoogleService as unknown as jest.Mock).mockClear();
    });

    it('continues refreshing remaining users when one user\'s Google authorization fails', async () => {
        const entities = [
            Object.assign(new GoogleCalendar({}), { userId: 1, calendarId: 'cal-1' }),
            Object.assign(new GoogleCalendar({}), { userId: 2, calendarId: 'cal-2' }),
        ];
        repository.findAll.mockResolvedValue(entities);

        let call = 0;
        (GoogleService as unknown as jest.Mock).mockImplementation(() => ({
            authorize: jest.fn().mockImplementation(() => {
                call++;
                if (call === 1) return Promise.reject(new Error('No credentials found'));
                return Promise.resolve({});
            }),
            getCalendarEvents: jest.fn().mockResolvedValue([]),
        }));

        await cron.refreshGoogleCalendarEvents();

        expect(repository.refreshGoogleCalendarEvents).toHaveBeenCalledTimes(1);
        expect(repository.refreshGoogleCalendarEvents).toHaveBeenCalledWith('cal-2', []);
    });

    it('skips a run that starts while a previous run is still in progress', async () => {
        const entities = [Object.assign(new GoogleCalendar({}), { userId: 1, calendarId: 'cal-1' })];
        let resolveFindAll: (value: GoogleCalendar[]) => void;
        repository.findAll.mockReturnValue(new Promise((resolve) => { resolveFindAll = resolve; }));
        (GoogleService as unknown as jest.Mock).mockImplementation(() => ({
            authorize: jest.fn().mockResolvedValue({}),
            getCalendarEvents: jest.fn().mockResolvedValue([]),
        }));

        const firstRun = cron.refreshGoogleCalendarEvents();
        const secondRun = cron.refreshGoogleCalendarEvents();

        resolveFindAll(entities);
        await Promise.all([firstRun, secondRun]);

        expect(repository.findAll).toHaveBeenCalledTimes(1);
    });
});
