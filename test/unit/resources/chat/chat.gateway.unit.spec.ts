import { Socket } from 'socket.io';
import { ChatGateway } from '../../../../src/resources/chat/chat.gateway';
import { MessagesService } from '../../../../src/resources/messages/messages.service';

describe('ChatGateway', () => {
    let gateway: ChatGateway;
    let messagesService: jest.Mocked<Pick<MessagesService, 'saveMessage' | 'findMessagesByRoom'>>;
    let emittedToRoom: { room: string; event: string; payload: unknown }[];

    beforeEach(() => {
        messagesService = {
            saveMessage: jest.fn().mockResolvedValue(undefined),
            findMessagesByRoom: jest.fn().mockResolvedValue([]),
        };
        gateway = new ChatGateway(messagesService as unknown as MessagesService);
        emittedToRoom = [];
        gateway.server = {
            to: (room: string) => ({
                emit: (event: string, payload: unknown) => emittedToRoom.push({ room, event, payload }),
            }),
        } as never;
    });

    function fakeClient (userId: string): Socket {
        return { data: { userId }, emit: jest.fn() } as unknown as Socket;
    }

    describe('handleMessage', () => {
        it('broadcasts the message straight to the room, with no Redis pub/sub in between', async () => {
            const client = fakeClient('user-1');

            await gateway.handleMessage({ chatRoomId: 'room-1', content: 'hello' }, client);

            expect(emittedToRoom).toHaveLength(1);
            expect(emittedToRoom[0].room).toBe('room-1');
            expect(emittedToRoom[0].event).toBe('message');
            expect(emittedToRoom[0].payload).toEqual(
                expect.objectContaining({ senderId: 'user-1', chatRoomId: 'room-1', content: 'hello' }),
            );
        });

        it('persists the message directly via MessagesService, with no queue in between', async () => {
            const client = fakeClient('user-1');

            await gateway.handleMessage({ chatRoomId: 'room-1', content: 'hello' }, client);

            expect(messagesService.saveMessage).toHaveBeenCalledWith(
                expect.objectContaining({ senderId: 'user-1', chatRoomId: 'room-1', content: 'hello' }),
            );
        });

        it('still broadcasts the message even if persistence fails', async () => {
            messagesService.saveMessage.mockRejectedValueOnce(new Error('db down'));
            const client = fakeClient('user-1');

            await expect(gateway.handleMessage({ chatRoomId: 'room-1', content: 'hello' }, client))
                .resolves.not.toThrow();

            expect(emittedToRoom).toHaveLength(1);
        });
    });
});
