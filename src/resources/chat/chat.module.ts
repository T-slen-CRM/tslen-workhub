import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { MessageModule } from '../messages/message.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LiveKitModule } from '../live-kit/live-kit.module';

@Module({
    imports: [MessageModule, NotificationsModule, LiveKitModule],
    providers: [ChatGateway],
    // No exports needed as ChatGateway is directly used by NestFactory
})
export class ChatModule {}
