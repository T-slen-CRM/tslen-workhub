import { Injectable } from '@nestjs/common';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { NotificationsRepository } from './notifications.repository';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService extends BaseAbstractService<Notification> {
    constructor (
        protected readonly repository: NotificationsRepository
    ) {
        super(repository, null);
        this.currentRepository = repository;
    }

    findAllForUser (userId: number): Promise<Notification[]> {
        return this.repository.findAllForUser(userId);
    }

    createForUser (userId: number, title: string, message: string): Promise<Notification> {
        return this.repository.create({ userId, title, message, isRead: 0 });
    }

    markManyAsRead (ids: number[]): Promise<void> {
        return this.repository.markManyAsRead(ids);
    }

    async clearMany (ids: number[]): Promise<void> {
        for (const id of ids) {
            await this.repository.delete(id);
        }
    }

    createBroadcast (notifications: Partial<Notification>[]): Promise<Notification[]> {
        return this.repository.createMany(notifications);
    }
}
