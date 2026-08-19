import { GoogleCalendarController } from '../../../../src/resources/google-calendar/google-calendar.controller';
import { GoogleCalendarService } from '../../../../src/resources/google-calendar/google-calendar.service';
import { TestBed } from '@automock/jest';
import { GoogleCalendar } from '../../../../src/resources/google-calendar/entities/google-calendar.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';

describe('GoogleCalendarController', () => {
    let controller: GoogleCalendarController;
    let googleCalendarService: jest.Mocked<GoogleCalendarService>;

    beforeEach(async () => {
        const { unit, unitRef } = TestBed.create(GoogleCalendarController).compile();
        controller = unit;
        googleCalendarService = unitRef.get(GoogleCalendarService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
    it('should call authorize', async () => {
        const mockResponse: GoogleCalendar = {
            id: 1,
            calendarId: 'test@gmail.com',
            timezone: 'Europe/Madrid',
            userId: 1,
            user: {} as Users
        };
        const mockUser = {} as Users;
        jest.spyOn(googleCalendarService, 'authorize').mockResolvedValue(mockResponse);
        const result = await controller.authorize(mockUser);
        expect(googleCalendarService.authorize).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('should call remove with the parsed id and requesting user', async () => {
        const mockResponse = { raw: [], affected: 1 };
        const requestingUser = { id: 7 } as Users;
        jest.spyOn(googleCalendarService, 'remove').mockResolvedValue(mockResponse);
        const result = await controller.remove(1, requestingUser);
        expect(googleCalendarService.remove).toHaveBeenCalledWith(1, requestingUser);
        expect(result).toEqual(mockResponse);
    });
    it('should call createMeetingSpace', async () => {
        const mockResponse = { uri: 'test' };
        const mockUser = {} as Users;
        jest.spyOn(googleCalendarService, 'createMeetingSpace').mockResolvedValue(mockResponse);
        const result = await controller.createMeetingSpace(mockUser);
        expect(googleCalendarService.createMeetingSpace).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
});
