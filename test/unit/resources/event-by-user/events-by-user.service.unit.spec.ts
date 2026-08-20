import { EventsByUserService } from '../../../../src/resources/events-by-user/events-by-user.service';
import { TestBed } from '@automock/jest';
import { mockedDateRangeDto, mockedEventByUser } from '../../../shared/event-by-user';
import { mockUser } from '../../../shared/users';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { EventsByUser } from '../../../../src/resources/events-by-user/entities/events-by-user.entity';

describe('EventsByUserService', () => {
    let service: EventsByUserService;

    beforeAll(() => {
        const { unit } = TestBed.create(EventsByUserService).compile();
        service = unit;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should get events by month', async () => {
        const result = [mockedEventByUser]
        jest.spyOn(service, 'getEventsByMonth').mockResolvedValue(result as unknown as EventsByUser[]);
        const res = await service.getEventsByMonth(mockUser as unknown as Users, mockedDateRangeDto);
        expect(res).toEqual(result);
    });
    it('should get absent today', async () => {
        const result = [mockedEventByUser]
        jest.spyOn(service, 'getAbsentToday').mockResolvedValue(result as unknown as EventsByUser[]);
        const res = await service.getAbsentToday(mockUser as unknown as Users);
        expect(res).toEqual(result);
    });
    it('should get pending', async () => {
        const result = [mockedEventByUser];
        jest.spyOn(service, 'getPending').mockResolvedValue(result as unknown as EventsByUser[]);
        const res = await service.getPending(mockUser as unknown as Users);
        expect(res).toEqual(result);
    });
    it('should call approveDisapproveEvent', async () => {
        const result = { status: 'ok' };
        jest.spyOn(service, 'approveDisapproveEvent').mockResolvedValue(result);
        const res = await service.approveDisapproveEvent('token', 1);
        expect(res).toEqual(result);
    });
    it('should call generateSecretToken', () => {
        const value = new Promise((resolve: (value: string)=>void) => resolve('test'));
        jest.spyOn(service, 'generateSecretToken').mockReturnValue(value);
        const res = service.generateSecretToken(1);
        expect(res).toEqual(value);
    });
});
