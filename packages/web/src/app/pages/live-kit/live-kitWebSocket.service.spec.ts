import { TestBed } from '@angular/core/testing';
import { LiveKitWebSocketService } from './live-kitWebSocket.service';
import { ConfigurationService } from '../../services/ConfigurationService';
import { AuthenticationService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LiveChatService } from '../../tslen-components/live-chat/live-chat.service';
import { LiveKitEvents } from './enum/live-kit.enum';
import { of, Subject } from 'rxjs';

describe('LiveKitWebSocketService', () => {
  let service: LiveKitWebSocketService;
  let fakeSocket: { on: jasmine.Spy; handlers: Record<string, (data: unknown) => void> };

  beforeEach(() => {
    fakeSocket = {
      handlers: {},
      on: jasmine.createSpy('on').and.callFake(function (this: unknown, event: string, cb: (data: unknown) => void) {
        fakeSocket.handlers[event] = cb;
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        LiveKitWebSocketService,
        { provide: ConfigurationService, useValue: { getApiHost: () => 'http://localhost' } },
        { provide: AuthenticationService, useValue: { authDataSignal: () => ({ id: 7 }) } },
        { provide: Router, useValue: {} },
        { provide: MatDialog, useValue: {} },
        { provide: LiveChatService, useValue: { setActiveCallData: jasmine.createSpy('setActiveCallData') } },
      ],
    });
    service = TestBed.inject(LiveKitWebSocketService);
    (service as unknown as { socket: unknown }).socket = fakeSocket;
    (service as unknown as { registerSocketListeners: () => void }).registerSocketListeners();
  });

  it('emits on notification$ when the socket receives a notification event', (done) => {
    const payload = { id: 1, title: 'New message', message: 'hi', isRead: 0 };

    service.notification$.subscribe((received) => {
      expect(received).toEqual(payload);
      done();
    });

    fakeSocket.handlers[LiveKitEvents.NOTIFICATION](payload);
  });

  it('closes only the registered outgoing-call dialog on CALL_ACCEPTED, not every open dialog', () => {
    const outgoingDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    service.registerOutgoingCallDialog(outgoingDialogRef);

    fakeSocket.handlers[LiveKitEvents.CALL_ACCEPTED]({ callerId: 1, calleeId: 2 });

    expect(outgoingDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('does nothing to any dialog on CALL_ACCEPTED when no outgoing-call dialog was registered', () => {
    expect(() => fakeSocket.handlers[LiveKitEvents.CALL_ACCEPTED]({ callerId: 1, calleeId: 2 })).not.toThrow();
  });
});
