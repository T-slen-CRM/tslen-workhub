import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

export class NotificationsRepository extends BaseAbstractRepository<Notification> {
    constructor (
        @InjectRepository(Notification)
        private readonly notificationsRepository: Repository<Notification>
    ) {
        super(notificationsRepository);
    }

    findAllForUser (userId: number): Promise<Notification[]> {
        return this.notificationsRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async markManyAsRead (ids: number[]): Promise<void> {
        await this.notificationsRepository.update(ids, { isRead: 1 });
    }

    createMany (notifications: Partial<Notification>[]): Promise<Notification[]> {
        return this.notificationsRepository.save(notifications);
    }
}
