import { Injectable } from '@nestjs/common';
import { ErrorService } from '../../common/services/error/error.service';
import { MessageRepository } from './message.repository';
// TODO add dto for message
@Injectable()
export class MessagesService{
    constructor (
    protected readonly messageRepository: MessageRepository,
    protected readonly errorService: ErrorService){
        console.log('MessagesService initialized', this.messageRepository);
    }

    async saveMessage (messageData: Partial<any>): Promise<any> {
        return this.messageRepository.save(messageData);
    }

    async findMessagesByRoom (chatRoomId: string, limit = 50): Promise<any[]> {
        // Query newest-first so `take` keeps the most recent messages,
        // then reverse to return them in chronological (oldest-first) order.
        const messages = await this.messageRepository.find({
            where: { chatRoomId },
            order: { timestamp: 'DESC' },
            take: limit,
        });
        return messages.reverse();
    }

    // async saveMessagesInBatch (messagesData: Partial<any>[]): Promise<any[]> {
    // // This is crucial for performance with high volume
    // //     const messages = this.messageRepository.create(messagesData);
    // //     return this.messageRepository.save(messages);
    // }
}
