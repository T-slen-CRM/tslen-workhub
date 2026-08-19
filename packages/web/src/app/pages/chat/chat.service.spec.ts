import { ChatService } from './chat.service';
import { ConfigurationService } from '../../services/ConfigurationService';

function createFakeSocket () {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  return {
    connected: true,
    on: jasmine.createSpy('on').and.callFake((event: string, cb: (...args: unknown[]) => void) => {
      handlers[event] = cb;
    }),
    emitServerEvent: (event: string, ...args: unknown[]) => handlers[event]?.(...args),
    disconnect: jasmine.createSpy('disconnect'),
    removeAllListeners: jasmine.createSpy('removeAllListeners').and.callFake(() => {
      Object.keys(handlers).forEach((key) => delete handlers[key]);
    }),
    emit: jasmine.createSpy('emit'),
  };
}

describe('ChatService', () => {
  let service: ChatService;
  let fakeConfigService: ConfigurationService;

  beforeEach(() => {
    fakeConfigService = { getApiHost: () => 'http://localhost' } as ConfigurationService;
    service = new ChatService(fakeConfigService);
  });

  it('stops the previous connection from delivering messages once a new one is opened for the same room', () => {
    const firstSocket = createFakeSocket();
    const secondSocket = createFakeSocket();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createSocketSpy = spyOn<any>(service, 'createSocket')
      .and.returnValues(firstSocket, secondSocket);

    service.listenForEvents('room-1', 42);
    service.listenForEvents('room-1', 42); // e.g. component re-runs listenForEvents for the same room

    expect(createSocketSpy).toHaveBeenCalledTimes(2);

    const received: unknown[] = [];
    service.getMessages().subscribe((message) => received.push(message));

    // Both sockets are still "connected" from the server's point of view unless the first was torn down.
    firstSocket.emitServerEvent('message', { content: 'hello' });
    secondSocket.emitServerEvent('message', { content: 'hello' });

    expect(received.length).toBe(1);
  });
});
