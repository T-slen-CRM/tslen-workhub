import { CreateEventsByUserDto } from 'src/resources/events-by-user/dto/create-events-by-user.dto';
import { DatesRangeDto } from '../../src/common/dto/dates-range.dto';
import { mockUser } from './users';

export const mockedEventByUser: CreateEventsByUserDto = {
    id: 1,
    userId: 1,
    title: 'Test',
    start: null,
    end: null,
    primaryColor: 'red',
    secondaryColor: 'blue',
    isRequest: true,
    approved: 1,
    comment: 'Test',
    requestType: 'Test',
    createdAt: null,
    timeOffset: 1,
    googleId: 'Test',
    isGoogleEvent: true,
    googleMeetLink: 'Test',
    user: mockUser,
    googleCalendarId: '1',
    secretToken: 'Test',
    attendees: [{ id: 1, eventId: 1, userEmail: 'Test', event: {} as CreateEventsByUserDto }]
}
export const mockedDateRangeDto: DatesRangeDto = {
    startDate: new Date(),
    endDate: new Date()
};
