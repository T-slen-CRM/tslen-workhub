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
    ): Promise<void> {
        if (body.isRead) {
            await this.notificationsService.markManyAsRead([id]);
        }
    }

    @Post('mark-as-read')
    async markAsRead (
        @Body(new ParseArrayPipe({ items: Number })) ids: number[],
    ): Promise<void> {
        await this.notificationsService.markManyAsRead(ids);
    }

    @Post('clear-all')
    async clearAll (
        @Body(new ParseArrayPipe({ items: Number })) ids: number[],
    ): Promise<void> {
        await this.notificationsService.clearMany(ids);
    }

    @Post('create')
    createBroadcast (
        @Body(new ParseArrayPipe({ items: CreateNotificationDto })) dtos: CreateNotificationDto[],
    ): Promise<Notification[]> {
        return this.notificationsService.createBroadcast(dtos);
    }
}
