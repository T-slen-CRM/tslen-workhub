import { Socket } from 'socket.io';
import { LiveKitGateway, LiveKitEvents } from '../../../../src/resources/live-kit/gateway/live-kit.gateway';

describe('LiveKitGateway', () => {
    let gateway: LiveKitGateway;

    beforeEach(() => {
        gateway = new LiveKitGateway();
    });

    function fakeClient (): Socket {
        return { emit: jest.fn() } as unknown as Socket;
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
    });
});
