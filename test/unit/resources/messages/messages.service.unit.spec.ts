import { TestBed } from '@automock/jest';
import { MessagesService } from '../../../../src/resources/messages/messages.service';
import { MessageRepository } from '../../../../src/resources/messages/message.repository';

describe('MessagesService', () => {
    let service: MessagesService;
    let messageRepository: jest.Mocked<MessageRepository>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(MessagesService).compile();
        service = unit;
        messageRepository = unitRef.get(MessageRepository);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findMessagesByRoom', () => {
        it('returns the most recent messages for the room in ascending chronological order', async () => {
            const oldest = { id: '1', content: 'first', timestamp: new Date('2026-01-01T00:00:00Z') };
            const middle = { id: '2', content: 'second', timestamp: new Date('2026-01-01T00:01:00Z') };
            const newest = { id: '3', content: 'third', timestamp: new Date('2026-01-01T00:02:00Z') };
            // The repository is queried newest-first (so LIMIT keeps the most recent ones).
            messageRepository.find.mockResolvedValue([newest, middle, oldest] as never);

            const result = await service.findMessagesByRoom('room-1', 3);

            expect(messageRepository.find).toHaveBeenCalledWith({
                where: { chatRoomId: 'room-1' },
                order: { timestamp: 'DESC' },
                take: 3,
            });
            expect(result).toEqual([oldest, middle, newest]);
        });
    });
});
