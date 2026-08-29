import { TestBed } from '@automock/jest';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { NotificationsController } from '../../../../src/resources/notifications/notifications.controller';
import { NotificationsService } from '../../../../src/resources/notifications/notifications.service';
import { Notification } from '../../../../src/resources/notifications/entities/notification.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { mockUser } from '../../../shared/users';
import { ROLES_KEY } from '../../../../src/common/guards/roles/roles.decorator';
import { Role } from '@tslen-workhub/shared';

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

            const result = await controller.findAll(mockUser as unknown as Users);

            expect(service.findAllForUser).toHaveBeenCalledWith(mockUser.id);
            expect(result).toBe(notifications);
        });
    });

    describe('markOneAsRead', () => {
        it('marks a single notification as read when it belongs to the user', async () => {
            const notifications = [{ id: 5 }] as Notification[];
            service.findAllForUser.mockResolvedValue(notifications);

            await controller.markOneAsRead(5, { isRead: 1 }, mockUser as unknown as Users);

            expect(service.findAllForUser).toHaveBeenCalledWith(mockUser.id);
            expect(service.markManyAsRead).toHaveBeenCalledWith([5]);
        });

        it('does not mark as read if the notification does not belong to the user', async () => {
            const notifications = [{ id: 10 }] as Notification[];
            service.findAllForUser.mockResolvedValue(notifications);

            await controller.markOneAsRead(5, { isRead: 1 }, mockUser as unknown as Users);

            expect(service.findAllForUser).toHaveBeenCalledWith(mockUser.id);
            expect(service.markManyAsRead).not.toHaveBeenCalled();
        });

        it('does not call markManyAsRead when isRead is 0', async () => {
            const notifications = [{ id: 5 }] as Notification[];
            service.findAllForUser.mockResolvedValue(notifications);

            await controller.markOneAsRead(5, { isRead: 0 }, mockUser as unknown as Users);

            expect(service.markManyAsRead).not.toHaveBeenCalled();
        });
    });

    describe('markAsRead', () => {
        it('marks the given ids as read when they belong to the user', async () => {
            const notifications = [{ id: 1 }, { id: 2 }, { id: 3 }] as Notification[];
            service.findAllForUser.mockResolvedValue(notifications);

            await controller.markAsRead([1, 2, 3], mockUser as unknown as Users);

            expect(service.findAllForUser).toHaveBeenCalledWith(mockUser.id);
            expect(service.markManyAsRead).toHaveBeenCalledWith([1, 2, 3]);
        });

        it('filters out ids that do not belong to the user', async () => {
            const notifications = [{ id: 1 }, { id: 3 }] as Notification[];
            service.findAllForUser.mockResolvedValue(notifications);

            await controller.markAsRead([1, 2, 3], mockUser as unknown as Users);

            expect(service.findAllForUser).toHaveBeenCalledWith(mockUser.id);
            expect(service.markManyAsRead).toHaveBeenCalledWith([1, 3]);
        });

        it('does not call markManyAsRead if no ids belong to the user', async () => {
            const notifications = [{ id: 5 }] as Notification[];
            service.findAllForUser.mockResolvedValue(notifications);

            await controller.markAsRead([1, 2, 3], mockUser as unknown as Users);

            expect(service.findAllForUser).toHaveBeenCalledWith(mockUser.id);
            expect(service.markManyAsRead).not.toHaveBeenCalled();
        });
    });

    describe('clearAll', () => {
        it('clears the given ids when they belong to the user', async () => {
            const notifications = [{ id: 1 }, { id: 2 }] as Notification[];
            service.findAllForUser.mockResolvedValue(notifications);

            await controller.clearAll([1, 2], mockUser as unknown as Users);

            expect(service.findAllForUser).toHaveBeenCalledWith(mockUser.id);
            expect(service.clearMany).toHaveBeenCalledWith([1, 2]);
        });

        it('filters out ids that do not belong to the user', async () => {
            const notifications = [{ id: 1 }] as Notification[];
            service.findAllForUser.mockResolvedValue(notifications);

            await controller.clearAll([1, 2], mockUser as unknown as Users);

            expect(service.findAllForUser).toHaveBeenCalledWith(mockUser.id);
            expect(service.clearMany).toHaveBeenCalledWith([1]);
        });

        it('does not call clearMany if no ids belong to the user', async () => {
            const notifications = [{ id: 5 }] as Notification[];
            service.findAllForUser.mockResolvedValue(notifications);

            await controller.clearAll([1, 2], mockUser as unknown as Users);

            expect(service.findAllForUser).toHaveBeenCalledWith(mockUser.id);
            expect(service.clearMany).not.toHaveBeenCalled();
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

        it('is restricted to Admin/Manager roles', () => {
            const roles = Reflect.getMetadata(ROLES_KEY, NotificationsController.prototype.createBroadcast);

            expect(roles).toEqual([Role.Admin, Role.Manager]);
        });

        it('responds with 200 OK instead of the default 201', () => {
            const httpCode = Reflect.getMetadata(HTTP_CODE_METADATA, NotificationsController.prototype.createBroadcast);

            expect(httpCode).toBe(200);
        });
    });
});
