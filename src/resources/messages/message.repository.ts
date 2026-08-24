import { Message } from './message.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export class MessageRepository {
    constructor (
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>
    ) {
    }
    find (options: any): Promise<Message[]> {
        return this.messageRepository.find(options);
    }
    save (messageData: Partial<Message>): Promise<Message> {
        return this.messageRepository.save(messageData);
    }
}
