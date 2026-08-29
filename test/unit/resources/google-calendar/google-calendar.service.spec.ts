import { GoogleCalendarService } from '../../../../src/resources/google-calendar/google-calendar.service';
import { TestBed } from '@automock/jest';
import { GoogleCalendar } from '../../../../src/resources/google-calendar/entities/google-calendar.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { mockUser } from '../../../shared/users';
import { GoogleCalendarRepository } from '../../../../src/resources/google-calendar/google-calendar.repository';
import { ErrorExceptionMethod, ErrorService, IThrowErrorObject } from '../../../../src/common/services/error/error.service';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@tslen-workhub/shared';

describe('GoogleCalendarService', () => {
    let service: GoogleCalendarService;
    let repository: jest.Mocked<GoogleCalendarRepository>;
    let errorService: jest.Mocked<ErrorService>;

    beforeEach(async () => {
        const { unit, unitRef } = TestBed.create(GoogleCalendarService).compile();
        service = unit;
        repository = unitRef.get(GoogleCalendarRepository);
        errorService = unitRef.get(ErrorService);
        errorService.aggregateError.mockImplementation(async (_log: string, _slack: string, throwError: IThrowErrorObject) => {
            if (throwError?.method === ErrorExceptionMethod.NotFound) throw new NotFoundException(throwError.message);
            if (throwError?.method === ErrorExceptionMethod.Unauthorized) throw new UnauthorizedException(throwError.message);
        });
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
        const user = mockUser as unknown as Users;
        jest.spyOn(service, 'createMeetingSpace').mockResolvedValue(mockResponse);
        const result = await service.createMeetingSpace(user);
        expect(result).toEqual(mockResponse);
    });

    describe('remove', () => {
        it('rejects with NotFound when the google calendar row does not exist', async () => {
            repository.findOne.mockResolvedValue(undefined);
            const requestingUser = { id: 1, role: Role.User } as Users;

            await expect(service.remove(999, requestingUser)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('rejects with Unauthorized when a non-owner, non-privileged user tries to delete someone else\'s google calendar', async () => {
            const entity: GoogleCalendar = { id: 5, calendarId: 'cal', timezone: 'UTC', userId: 42, user: {} as Users };
            repository.findOne.mockResolvedValue(entity);
            const requestingUser = { id: 1, role: Role.User } as Users;

            await expect(service.remove(5, requestingUser)).rejects.toBeInstanceOf(UnauthorizedException);
            expect(repository.delete).not.toHaveBeenCalled();
        });

        it('allows the owner to delete their own google calendar', async () => {
            const entity: GoogleCalendar = { id: 5, calendarId: 'cal', timezone: 'UTC', userId: 1, user: {} as Users };
            repository.findOne.mockResolvedValue(entity);
            const deleteResult = { raw: [], affected: 1 };
            repository.delete.mockResolvedValue(deleteResult);
            const requestingUser = { id: 1, role: Role.User } as Users;

            const result = await service.remove(5, requestingUser);

            expect(result).toEqual(deleteResult);
        });

        it('allows an Admin to delete another user\'s google calendar', async () => {
            const entity: GoogleCalendar = { id: 5, calendarId: 'cal', timezone: 'UTC', userId: 42, user: {} as Users };
            repository.findOne.mockResolvedValue(entity);
            const deleteResult = { raw: [], affected: 1 };
            repository.delete.mockResolvedValue(deleteResult);
            const requestingUser = { id: 1, role: Role.Admin } as Users;

            const result = await service.remove(5, requestingUser);

            expect(result).toEqual(deleteResult);
        });
    });
});
