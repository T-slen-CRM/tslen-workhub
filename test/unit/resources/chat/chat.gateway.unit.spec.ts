import { Socket } from 'socket.io';
import { ChatGateway } from '../../../../src/resources/chat/chat.gateway';
import { MessagesService } from '../../../../src/resources/messages/messages.service';
import { NotificationsService } from '../../../../src/resources/notifications/notifications.service';
import { LiveKitGateway } from '../../../../src/resources/live-kit/gateway/live-kit.gateway';

describe('ChatGateway', () => {
    let gateway: ChatGateway;
    let messagesService: jest.Mocked<Pick<MessagesService, 'saveMessage' | 'findMessagesByRoom'>>;
    let notificationsService: jest.Mocked<Pick<NotificationsService, 'createForUser'>>;
    let liveKitGateway: jest.Mocked<Pick<LiveKitGateway, 'notifyUser'>>;
    let emittedToRoom: { room: string; event: string; payload: unknown }[];

    beforeEach(() => {
        messagesService = {
            saveMessage: jest.fn().mockResolvedValue(undefined),
            findMessagesByRoom: jest.fn().mockResolvedValue([]),
        };
        notificationsService = {
            createForUser: jest.fn().mockResolvedValue({ id: 1, userId: 9, title: 'New message', message: 'hello', isRead: 0 }),
        };
        liveKitGateway = {
            notifyUser: jest.fn(),
        };
        gateway = new ChatGateway(
            messagesService as unknown as MessagesService,
            notificationsService as unknown as NotificationsService,
            liveKitGateway as unknown as LiveKitGateway,
        );
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

        it('creates a notification for the other participant, not the sender', async () => {
            const client = fakeClient('9');

            await gateway.handleMessage({ chatRoomId: '9_15', content: 'hello there' }, client);

            expect(notificationsService.createForUser).toHaveBeenCalledWith(15, 'New message', 'hello there');
        });

        it('pushes the created notification to the recipient via LiveKitGateway', async () => {
            const client = fakeClient('9');
            const created = { id: 42, userId: 15, title: 'New message', message: 'hello there', isRead: 0 };
            notificationsService.createForUser.mockResolvedValue(created as never);

            await gateway.handleMessage({ chatRoomId: '9_15', content: 'hello there' }, client);

            expect(liveKitGateway.notifyUser).toHaveBeenCalledWith(15, created);
        });

        it('truncates a long message to 100 chars for the notification body', async () => {
            const client = fakeClient('9');
            const longContent = 'a'.repeat(150);

            await gateway.handleMessage({ chatRoomId: '9_15', content: longContent }, client);

            expect(notificationsService.createForUser).toHaveBeenCalledWith(15, 'New message', 'a'.repeat(100) + '…');
        });
    });
});
