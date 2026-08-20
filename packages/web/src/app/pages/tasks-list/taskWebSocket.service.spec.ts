import { TestBed } from '@angular/core/testing';
import { TaskWebSocketService } from './taskWebSocket.service';
import { ConfigurationService } from '../../services/ConfigurationService';

describe('TaskWebSocketService', () => {
  let service: TaskWebSocketService;
  let fakeSocket: { on: jasmine.Spy; off: jasmine.Spy; emit: jasmine.Spy; disconnect: jasmine.Spy; connected: boolean };

  beforeEach(() => {
    fakeSocket = {
      on: jasmine.createSpy('on'),
      off: jasmine.createSpy('off'),
      emit: jasmine.createSpy('emit'),
      disconnect: jasmine.createSpy('disconnect'),
      connected: true,
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ConfigurationService, useValue: { getApiHost: () => 'http://localhost:4004' } },
      ],
    });

    service = TestBed.inject(TaskWebSocketService);
    // Swap in a fake after construction — the real constructor opens a real socket.io
    // connection, which this test has no interest in exercising.
    (service as any).socket = fakeSocket;
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
    const second = service.getMessages('update').subscribe((data) => secondReceived.push(data));

    first.unsubscribe();

    const secondHandler = fakeSocket.on.calls.mostRecent().args[1];
    secondHandler({ id: 1 });

    expect(secondReceived).toEqual([{ id: 1 }]);
  });
});
