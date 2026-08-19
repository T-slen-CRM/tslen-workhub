import { GoogleCalendarService } from '../../../../src/resources/google-calendar/google-calendar.service';
import { TestBed } from '@automock/jest';
import { GoogleCalendar } from '../../../../src/resources/google-calendar/entities/google-calendar.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { mockUser } from '../../../shared/users';

describe('GoogleCalendarService', () => {
    let service: GoogleCalendarService;

    beforeEach(async () => {
        const { unit } = TestBed.create(GoogleCalendarService).compile();
        service = unit;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
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
        jest.spyOn(service, 'authorize').mockResolvedValue(mockResponse);
        const result = await service.authorize(mockUser);
        expect(result).toEqual(mockResponse);
    });
    it('should call createMeetingSpace', async () => {
        const mockResponse = { uri: 'test' };
        const user = mockUser;
        jest.spyOn(service, 'createMeetingSpace').mockResolvedValue(mockResponse);
        const result = await service.createMeetingSpace(user);
        expect(result).toEqual(mockResponse);
    });

});
