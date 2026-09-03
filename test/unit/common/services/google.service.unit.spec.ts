import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import { authenticate } from '@google-cloud/local-auth';
import { OAuth2Client } from 'google-auth-library';
import { GoogleService, IGoogleCalendarEvent } from '../../../../src/common/services/google/google.service';
import { CreateEventsByUserDto } from '../../../../src/resources/events-by-user/dto/create-events-by-user.dto';
import { mockedEventByUser } from '../../../shared/event-by-user';

jest.mock('fs/promises');
jest.mock('@google-cloud/local-auth');
jest.mock('google-auth-library');
const path = {
    join: jest.fn(),
};

describe('GoogleService', () => {
    let service: GoogleService;
    let configService: ConfigService;

    beforeEach(() => {
        configService = {
            get: jest.fn().mockReturnValue('mock/google_credentials.json'),
        } as unknown as ConfigService;
        service = new GoogleService(configService);
        service.authorize = jest.fn(() => Promise.resolve(new OAuth2Client()));

        (path.join as jest.Mock).mockReturnValue('/mock/path/to/credentials/token_123.json');
    });

    describe('authorize', () => {
        const mockUserId = 123;

        it('should load saved credentials if they exist', async () => {
            const mockAuthClient = new OAuth2Client();
            (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify({ type: 'authorized_user' }));
            (authenticate as jest.Mock).mockResolvedValue(mockAuthClient);
            const result = await service.authorize(mockUserId);
            expect(result).toEqual(mockAuthClient);
        });
        it('should throw when no saved credentials exist, instead of resolving with an Error value', async () => {
            const freshService = new GoogleService(configService);
            jest.spyOn(freshService, 'loadSavedCredentialsIfExist').mockResolvedValue(null);
            await expect(freshService.authorize(mockUserId)).rejects.toThrow();
        });
        it('should call getCalendarData', async () => {
            const mockResponse = { id: 1, calendarId: '', timezone: '', userId: 1, user: {} };
            jest.spyOn(service, 'getCalendarData').mockResolvedValue(mockResponse);
            const authClient = '';
            const result = await service.getCalendarData(authClient);
            expect(result).toEqual(mockResponse);
        });
        it('should call createCalendarEvent', async () => {
            const mockResponse: IGoogleCalendarEvent = { end: { dateTime: '' }, start: { dateTime: '' }, summary: '' }
            const mockDto: CreateEventsByUserDto = Object.assign({ googleTimezone: '' }, mockedEventByUser);
            jest.spyOn(service, 'createCalendarEvent').mockResolvedValue(mockResponse);
            const result = await service.createCalendarEvent(mockDto, 1);
            expect(result).toEqual(mockResponse);
        });
        it('should call updateCalendarEvent', async () => {
            const mockResponse: IGoogleCalendarEvent = { end: { dateTime: '' }, start: { dateTime: '' }, summary: '' }
            const mockDto: CreateEventsByUserDto = Object.assign({ googleTimezone: '' }, mockedEventByUser);
            jest.spyOn(service, 'updateCalendarEvent').mockResolvedValue(mockResponse);
            const result = await service.updateCalendarEvent(mockDto, 1);
            expect(result).toEqual(mockResponse);
        });
        it('should call deleteCalendarEvent', async () => {
            const calendarId = 'calendarId';
            const eventId = '1';
            jest.spyOn(service, 'deleteCalendarEvent').mockResolvedValue(null);
            const result = await service.deleteCalendarEvent(calendarId, eventId, 1);
            expect(result).toEqual(null);
        });

    });
    it('should return correct permissions based on the provided scope', () => {
        const scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email';
        const expectedPermissions = {
            calendar: 1,
            meetingSpace: 0,
            email: 1,
        };

        const result = service.getGooglePermissions(scope);

        expect(result).toEqual(expectedPermissions);
    });

    it('should return all permissions as 0 if scope is empty', () => {
        const scope = '';
        const expectedPermissions = {
            calendar: 0,
            meetingSpace: 0,
            email: 0,
        };

        const result = service.getGooglePermissions(scope);

        expect(result).toEqual(expectedPermissions);
    });

    it('should return all permissions as 0 if scope does not match any', () => {
        const scope = 'https://www.googleapis.com/auth/unknown';
        const expectedPermissions = {
            calendar: 0,
            meetingSpace: 0,
            email: 0,
        };

        const result = service.getGooglePermissions(scope);

        expect(result).toEqual(expectedPermissions);
    });

    describe('getGoogleDate', () => {
        // EventsByUser.start/end is a "timestamp without time zone" column and every other
        // producer (the create/edit event dialog) stores the literal wall-clock digits the
        // user picked, with no UTC conversion — see AGENTS.md's TZ=UTC note. Google's API
        // returns an offset-aware string, so converting it to a true UTC instant here (the
        // old behavior) shifts the stored digits and makes synced events render in the wrong
        // timezone downstream. Keep the literal digits instead, matching manually created events.
        it('keeps the literal wall-clock digits of a dateTime with a non-zero UTC offset', () => {
            const result = service.getGoogleDate({ dateTime: '2026-08-17T15:00:00+02:00' as unknown as Date, date: undefined });

            expect(result.toISOString()).toBe('2026-08-17T15:00:00.000Z');
        });

        it('keeps the literal wall-clock digits of a dateTime with a Z suffix', () => {
            const result = service.getGoogleDate({ dateTime: '2026-08-17T15:00:00Z' as unknown as Date, date: undefined });

            expect(result.toISOString()).toBe('2026-08-17T15:00:00.000Z');
        });

        it('keeps the literal wall-clock digits of a dateTime with a negative UTC offset', () => {
            const result = service.getGoogleDate({ dateTime: '2026-08-17T09:00:00-04:00' as unknown as Date, date: undefined });

            expect(result.toISOString()).toBe('2026-08-17T09:00:00.000Z');
        });
    });
});
