import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SlackService } from '../../common/services/slack/slack.service';
import { ErrorService } from '../../common/services/error/error.service';
import { Message } from './message.entity';
import { MessagesService } from './messages.service';
import { MessageRepository } from './message.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Message
        ])
    ],
    providers: [
        MessagesService,
        MessageRepository,
        ErrorService,
        SlackService,
    ],
    exports: [
        MessagesService,
        MessageRepository
    ]
})
export class MessageModule {
    constructor () {
        console.log('MessageModule initialized');
    }
}
