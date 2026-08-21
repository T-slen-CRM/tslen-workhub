import { Socket } from 'socket.io';
import { LiveKitGateway, LiveKitEvents } from '../../../../src/resources/live-kit/gateway/live-kit.gateway';

describe('LiveKitGateway', () => {
    let gateway: LiveKitGateway;

    beforeEach(() => {
        gateway = new LiveKitGateway();
    });

    function fakeClient (): Socket {
        return { emit: jest.fn(), data: {} } as unknown as Socket;
    }

    describe('notifyUser', () => {
        it('emits a notification event to the target user\'s registered socket', async () => {
            const client = fakeClient();
            await gateway.register({ userId: 7 }, client);

            gateway.notifyUser(7, { id: 1, title: 'New message' });

            expect(client.emit).toHaveBeenCalledWith(LiveKitEvents.NOTIFICATION, { id: 1, title: 'New message' });
        });

        it('does nothing when the target user has no registered socket', () => {
            expect(() => gateway.notifyUser(999, { id: 1 })).not.toThrow();
        });

        it('delivers the notification when the client registers with a string userId', async () => {
            const client = fakeClient();
            await gateway.register({ userId: '7' }, client);

            gateway.notifyUser(7, { id: 1, title: 'New message' });

            expect(client.emit).toHaveBeenCalledWith(LiveKitEvents.NOTIFICATION, { id: 1, title: 'New message' });
        });

        it('coerces a string userId passed to notifyUser to match a numerically-registered socket', async () => {
            const client = fakeClient();
            await gateway.register({ userId: 7 }, client);

            gateway.notifyUser('7' as unknown as number, { id: 1, title: 'New message' });

            expect(client.emit).toHaveBeenCalledWith(LiveKitEvents.NOTIFICATION, { id: 1, title: 'New message' });
        });
    });

    describe('handleDisconnect', () => {
        it('removes the disconnected socket from the online users so it is no longer notified', async () => {
            const client = fakeClient();
            await gateway.register({ userId: 7 }, client);

            gateway.handleDisconnect(client);
            gateway.notifyUser(7, { id: 1, title: 'New message' });

            expect(client.emit).not.toHaveBeenCalledWith(LiveKitEvents.NOTIFICATION, expect.anything());
        });

        it('does not remove a newer registration for the same user when an older socket disconnects', async () => {
            const oldClient = fakeClient();
            const newClient = fakeClient();
            await gateway.register({ userId: 7 }, oldClient);
            await gateway.register({ userId: 7 }, newClient);

            gateway.handleDisconnect(oldClient);
            gateway.notifyUser(7, { id: 1, title: 'New message' });

            expect(newClient.emit).toHaveBeenCalledWith(LiveKitEvents.NOTIFICATION, { id: 1, title: 'New message' });
        });
    });
});
