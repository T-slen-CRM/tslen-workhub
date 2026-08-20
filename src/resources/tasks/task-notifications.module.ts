import { Module } from '@nestjs/common';
import { TaskNotificationsService } from './task-notifications.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../../common/services/mail/mail.module';
import { LiveKitModule } from '../live-kit/live-kit.module';

@Module({
    imports: [NotificationsModule, MailModule, LiveKitModule],
    providers: [TaskNotificationsService],
    exports: [TaskNotificationsService],
})
export class TaskNotificationsModule {}
