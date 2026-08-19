import { EventsByUserController } from '../../../../src/resources/events-by-user/events-by-user.controller';
import { EventsByUserService } from '../../../../src/resources/events-by-user/events-by-user.service';
import { TestBed } from '@automock/jest';
import { mockedDateRangeDto, mockedEventByUser } from '../../../shared/event-by-user';
import { mockUser } from '../../../shared/users';
import { DeleteResult } from 'typeorm';
import { CreateEventsByUserDto } from '../../../../src/resources/events-by-user/dto/create-events-by-user.dto';
import { EventsByUser } from '../../../../src/resources/events-by-user/entities/events-by-user.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';

describe('EventsByUserController', () => {
    let controller: EventsByUserController;

    let eventByUserService: jest.Mocked<EventsByUserService>;

    beforeAll(async () => {
        const { unit, unitRef } = TestBed.create(EventsByUserController).compile();
        controller = unit;
        eventByUserService = unitRef.get(EventsByUserService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should call eventByUserService.getEventsByMonth', async () => {
        const mockResponse = [mockedEventByUser];

        jest.spyOn(eventByUserService, 'getEventsByMonth').mockResolvedValue(mockResponse as EventsByUser[]);

        const result = await controller.getEventsByMonth(mockUser as Users, mockedDateRangeDto);
        expect(eventByUserService.getEventsByMonth).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });

    it('should call eventByUserService.getAbsentToday', async () => {
        const mockResponse = [mockedEventByUser];

        jest.spyOn(eventByUserService, 'getAbsentToday').mockResolvedValue(mockResponse as EventsByUser[]);

        const result = await controller.getAbsentToday(mockUser as Users);
        expect(eventByUserService.getAbsentToday).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });

    it('should call eventByUserService.create', async () => {
        const createDTO: CreateEventsByUserDto = Object.assign({ googleTimezone: 'Europe/Madrid' }, mockedEventByUser);
        const mockResponse = mockedEventByUser;

        jest.spyOn(eventByUserService, 'create').mockResolvedValue(mockResponse as EventsByUser);

        const result = await controller.create(createDTO, mockUser as Users);
        expect(eventByUserService.create).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('should call eventByUserService.update', async () => {
        const mockResponse = mockedEventByUser;

        jest.spyOn(eventByUserService, 'update').mockResolvedValue(mockResponse as EventsByUser);

        const result = await controller.update(1, mockedEventByUser);
        expect(eventByUserService.update).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('should call eventByUserService.delete', async () => {
        const mockResponse = { affected: 1 } as DeleteResult;

        jest.spyOn(eventByUserService, 'delete').mockResolvedValue(mockResponse);

        const result = await controller.delete(1);
        expect(eventByUserService.delete).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('should call eventByUserService.getPending', async () => {
        const mockResponse = [mockedEventByUser];

        jest.spyOn(eventByUserService, 'getPending').mockResolvedValue(mockResponse as EventsByUser[]);

        const result = await controller.getPending(mockUser as Users);
        expect(eventByUserService.getPending).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('should call eventByUserService.approveEvent', async () => {
        const mockResponse = { status: 'ok' };

        jest.spyOn(eventByUserService, 'approveDisapproveEvent').mockResolvedValue(mockResponse);

        const result = await controller.approveEvent('token');
        expect(eventByUserService.approveDisapproveEvent).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('should call eventByUserService.disapproveEvent', async () => {
        const mockResponse = { status: 'ok' };

        jest.spyOn(eventByUserService, 'approveDisapproveEvent').mockResolvedValue(mockResponse);

        const result = await controller.disapproveEvent('token');
        expect(eventByUserService.approveDisapproveEvent).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
});
