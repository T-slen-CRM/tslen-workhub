import { TestBed } from '@automock/jest';
import { NotificationsService } from '../../../../src/resources/notifications/notifications.service';
import { NotificationsRepository } from '../../../../src/resources/notifications/notifications.repository';
import { Notification } from '../../../../src/resources/notifications/entities/notification.entity';

describe('NotificationsService', () => {
    let service: NotificationsService;
    let repository: jest.Mocked<NotificationsRepository>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(NotificationsService).compile();
        service = unit;
        repository = unitRef.get(NotificationsRepository);
    });

    describe('findAllForUser', () => {
        it('delegates to NotificationsRepository.findAllForUser', async () => {
            const notifications = [{ id: 1 }] as Notification[];
            repository.findAllForUser.mockResolvedValue(notifications);

            const result = await service.findAllForUser(7);

            expect(repository.findAllForUser).toHaveBeenCalledWith(7);
            expect(result).toBe(notifications);
        });
    });

    describe('createForUser', () => {
        it('creates an unread notification for the given user', async () => {
            const created = { id: 1, userId: 7, title: 'New message', message: 'hi', isRead: 0 } as Notification;
            repository.create.mockResolvedValue(created);

            const result = await service.createForUser(7, 'New message', 'hi');

            expect(repository.create).toHaveBeenCalledWith({ userId: 7, title: 'New message', message: 'hi', isRead: 0 });
            expect(result).toBe(created);
        });
    });

    describe('markManyAsRead', () => {
        it('delegates to NotificationsRepository.markManyAsRead', async () => {
            await service.markManyAsRead([1, 2, 3]);

            expect(repository.markManyAsRead).toHaveBeenCalledWith([1, 2, 3]);
        });
    });

    describe('clearMany', () => {
        it('deletes each given id', async () => {
            repository.delete.mockResolvedValue(undefined as never);

            await service.clearMany([1, 2]);

            expect(repository.delete).toHaveBeenCalledWith(1);
            expect(repository.delete).toHaveBeenCalledWith(2);
        });
    });

    describe('createBroadcast', () => {
        it('delegates to NotificationsRepository.createMany', async () => {
            const notifications = [{ id: 1 }, { id: 2 }] as Notification[];
            repository.createMany.mockResolvedValue(notifications);

            const result = await service.createBroadcast([{ userId: 1, title: 't', message: 'm' }]);

            expect(repository.createMany).toHaveBeenCalledWith([{ userId: 1, title: 't', message: 'm' }]);
            expect(result).toBe(notifications);
        });
    });
});
