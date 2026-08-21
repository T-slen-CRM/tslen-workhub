import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { CallButtonRendererComponent } from './buttonRender.component';
import { DataService } from 'src/app/services/data.service';
import { AuthenticationService } from 'src/app/services/auth.service';
import { LiveKitWebSocketService } from 'src/app/pages/live-kit/live-kitWebSocket.service';
import { LiveKitEvents } from 'src/app/pages/live-kit/enum/live-kit.enum';

describe('CallButtonRendererComponent', () => {
  let component: CallButtonRendererComponent;
  let liveKitWebSocketService: jasmine.SpyObj<LiveKitWebSocketService>;
  let afterClosed$: Subject<boolean | undefined>;
  let dialogRefSpy: any;

  beforeEach(() => {
    afterClosed$ = new Subject<boolean | undefined>();
    dialogRefSpy = { afterClosed: () => afterClosed$ };
    liveKitWebSocketService = jasmine.createSpyObj('LiveKitWebSocketService', ['send', 'registerOutgoingCallDialog']);

    TestBed.configureTestingModule({
      imports: [CallButtonRendererComponent, TranslateModule.forRoot()],
      providers: [
        { provide: MatDialog, useValue: { open: () => dialogRefSpy } },
        { provide: DataService, useValue: { getOneUser: () => of({ body: {} }) } },
        { provide: AuthenticationService, useValue: { authDataSignal: () => ({ id: 1, firstName: 'A', lastName: 'B', avatar: '' }) } },
        { provide: LiveKitWebSocketService, useValue: liveKitWebSocketService },
      ],
    });

    const fixture = TestBed.createComponent(CallButtonRendererComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('selectedUserId', 2);
  });

  it('registers the outgoing-call dialog with LiveKitWebSocketService so CALL_ACCEPTED can close just this one', () => {
    component.call();

    expect(liveKitWebSocketService.registerOutgoingCallDialog).toHaveBeenCalledWith(dialogRefSpy);
  });

  it('does not send CALL_REJECTED when the dialog closes because the call was accepted', () => {
    component.call();

    afterClosed$.next(true);

    expect(liveKitWebSocketService.send).not.toHaveBeenCalledWith(LiveKitEvents.CALL_REJECTED, jasmine.anything());
  });

  it('sends CALL_REJECTED when the dialog closes without acceptance (cancelled/rejected)', () => {
    component.call();

    afterClosed$.next(undefined);

    expect(liveKitWebSocketService.send).toHaveBeenCalledWith(LiveKitEvents.CALL_REJECTED, { callerId: 2, calleeId: 1 });
  });
});
