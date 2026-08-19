import { TestBed } from '@automock/jest';
import { NotificationsController } from '../../../../src/resources/notifications/notifications.controller';
import { NotificationsService } from '../../../../src/resources/notifications/notifications.service';
import { Notification } from '../../../../src/resources/notifications/entities/notification.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { mockUser } from '../../../shared/users';

describe('NotificationsController', () => {
    let controller: NotificationsController;
    let service: jest.Mocked<NotificationsService>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(NotificationsController).compile();
        controller = unit;
        service = unitRef.get(NotificationsService);
    });

    describe('findAll', () => {
        it('returns the authenticated user\'s notifications', async () => {
            const notifications = [{ id: 1 }] as Notification[];
            service.findAllForUser.mockResolvedValue(notifications);

            const result = await controller.findAll(mockUser as Users);

            expect(service.findAllForUser).toHaveBeenCalledWith(mockUser.id);
            expect(result).toBe(notifications);
        });
    });

    describe('markOneAsRead', () => {
        it('marks a single notification as read', async () => {
            await controller.markOneAsRead(5, { isRead: 1 });

            expect(service.markManyAsRead).toHaveBeenCalledWith([5]);
        });
    });

    describe('markAsRead', () => {
        it('marks the given ids as read', async () => {
            await controller.markAsRead([1, 2, 3]);

            expect(service.markManyAsRead).toHaveBeenCalledWith([1, 2, 3]);
        });
    });

    describe('clearAll', () => {
        it('clears the given ids', async () => {
            await controller.clearAll([1, 2]);

            expect(service.clearMany).toHaveBeenCalledWith([1, 2]);
        });
    });

    describe('createBroadcast', () => {
        it('bulk-creates the given notifications', async () => {
            const dtos = [{ userId: 1, title: 't', message: 'm', isRead: 0 }];
            const created = [{ id: 1 }] as Notification[];
            service.createBroadcast.mockResolvedValue(created);

            const result = await controller.createBroadcast(dtos as never);

            expect(service.createBroadcast).toHaveBeenCalledWith(dtos);
            expect(result).toBe(created);
        });
    });
});
