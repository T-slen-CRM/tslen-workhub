import { TestBed } from '@angular/core/testing';
import { io } from 'socket.io-client';
import { TaskWebSocketService } from './taskWebSocket.service';
import { ConfigurationService } from '../../services/ConfigurationService';

jest.mock('socket.io-client');

describe('TaskWebSocketService', () => {
  let service: TaskWebSocketService;
  let fakeSocket: { on: jasmine.Spy; off: jasmine.Spy; emit: jasmine.Spy; disconnect: jasmine.Spy; connected: boolean };
  let ioMock: jest.Mock;

  beforeEach(() => {
    fakeSocket = {
      on: jasmine.createSpy('on'),
      off: jasmine.createSpy('off'),
      emit: jasmine.createSpy('emit'),
      disconnect: jasmine.createSpy('disconnect'),
      connected: true,
    };
    ioMock = io as unknown as jest.Mock;
    ioMock.mockReturnValue(fakeSocket);
    localStorage.setItem('jwtToken', 'a-jwt-token');

    TestBed.configureTestingModule({
      providers: [
        { provide: ConfigurationService, useValue: { getApiHost: () => 'http://localhost:4004' } },
      ],
    });

    service = TestBed.inject(TaskWebSocketService);
  });

  afterEach(() => {
    localStorage.removeItem('jwtToken');
  });

  it('authenticates the connection via the socket.io auth handshake payload, not a custom header', () => {
    // extraHeaders is unreliable for this: browsers' native WebSocket API has no
    // way to set custom headers once the transport upgrades from polling, so a
    // token sent that way can silently never reach the server. auth.token rides
    // in the handshake payload itself and works over both transports.
    expect(ioMock).toHaveBeenCalledWith('http://localhost:4004/tasks', jasmine.objectContaining({
      auth: { token: jasmine.any(String) },
    }));
    const options = ioMock.mock.calls[0][1];
    expect(options.extraHeaders).toBeUndefined();
  });

  it('does not disconnect the shared socket when one listener unsubscribes (regression: it used to kill every other subscriber\'s connection)', () => {
    const subscription = service.getMessages('update').subscribe();

    subscription.unsubscribe();

    expect(fakeSocket.disconnect).not.toHaveBeenCalled();
  });

  it('removes only its own listener on unsubscribe', () => {
    const subscription = service.getMessages('update').subscribe();
    const registeredHandler = fakeSocket.on.calls.mostRecent().args[1];

    subscription.unsubscribe();

    expect(fakeSocket.off).toHaveBeenCalledWith('update', registeredHandler);
  });

  it('leaves a second, independent subscription on the same event unaffected when the first unsubscribes', () => {
    const first = service.getMessages('update').subscribe();
    const secondReceived: any[] = [];
    service.getMessages('update').subscribe((data) => secondReceived.push(data));

    first.unsubscribe();

    const secondHandler = fakeSocket.on.calls.mostRecent().args[1];
    secondHandler({ id: 1 });

    expect(secondReceived).toEqual([{ id: 1 }]);
  });
});
