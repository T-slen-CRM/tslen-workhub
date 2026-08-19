import { Body, Controller, Get, ParseArrayPipe, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';
import { Notification } from './entities/notification.entity';

@Controller('notifications')
export class NotificationsController {
    constructor (private readonly notificationsService: NotificationsService) {}

    @Get()
    findAll (@User() user: Users): Promise<Notification[]> {
        return this.notificationsService.findAllForUser(user.id);
    }

    @Patch(':id')
    async markOneAsRead (
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { isRead: number },
        @User() user: Users,
    ): Promise<void> {
        if (body.isRead) {
            const userNotifications = await this.notificationsService.findAllForUser(user.id);
            const userNotificationIds = userNotifications.map(n => n.id);
            if (userNotificationIds.includes(id)) {
                await this.notificationsService.markManyAsRead([id]);
            }
        }
    }

    @Post('mark-as-read')
    async markAsRead (
        @Body(new ParseArrayPipe({ items: Number })) ids: number[],
        @User() user: Users,
    ): Promise<void> {
        const userNotifications = await this.notificationsService.findAllForUser(user.id);
        const userNotificationIds = userNotifications.map(n => n.id);
        const filteredIds = ids.filter(id => userNotificationIds.includes(id));
        if (filteredIds.length > 0) {
            await this.notificationsService.markManyAsRead(filteredIds);
        }
    }

    @Post('clear-all')
    async clearAll (
        @Body(new ParseArrayPipe({ items: Number })) ids: number[],
        @User() user: Users,
    ): Promise<void> {
        const userNotifications = await this.notificationsService.findAllForUser(user.id);
        const userNotificationIds = userNotifications.map(n => n.id);
        const filteredIds = ids.filter(id => userNotificationIds.includes(id));
        if (filteredIds.length > 0) {
            await this.notificationsService.clearMany(filteredIds);
        }
    }

    @Post('create')
    createBroadcast (
        @Body(new ParseArrayPipe({ items: CreateNotificationDto })) dtos: CreateNotificationDto[],
    ): Promise<Notification[]> {
        return this.notificationsService.createBroadcast(dtos);
    }
}
