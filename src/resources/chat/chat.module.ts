import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { MessageModule } from '../messages/message.module';

@Module({
    imports: [MessageModule],
    providers: [ChatGateway],
    // No exports needed as ChatGateway is directly used by NestFactory
})
export class ChatModule {}
