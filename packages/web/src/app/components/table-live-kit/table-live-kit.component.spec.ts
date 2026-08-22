import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { CallUsersOnlineComponent } from './table-live-kit.component';
import { DataService } from '../../services/data.service';
import { AuthenticationService } from '../../services/auth.service';
import { LanguageService } from '../../language/language.service';
import { LiveKitWebSocketService } from 'src/app/pages/live-kit/live-kitWebSocket.service';
import { LiveChatService } from '../../tslen-components/live-chat/live-chat.service';

describe('CallUsersOnlineComponent', () => {
  let component: CallUsersOnlineComponent;
  let liveKitWebSocketServiceSpy: jasmine.SpyObj<LiveKitWebSocketService>;

  beforeEach(() => {
    liveKitWebSocketServiceSpy = jasmine.createSpyObj('LiveKitWebSocketService', ['send'], {
      onlineStatus$: of({}),
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: DataService, useValue: { getAgGridData: () => of([]) } },
        { provide: AuthenticationService, useValue: { authDataSignal: () => ({ id: 1, userRole: 'user' }) } },
        {
          provide: LanguageService,
          useValue: { currentLang: 'en', onLangChange: new Subject(), get: () => of({}) },
        },
        { provide: LiveKitWebSocketService, useValue: liveKitWebSocketServiceSpy },
        { provide: LiveChatService, useValue: { setSelectedChatId: () => {} } },
      ],
    });

    component = TestBed.runInInjectionContext(() => new CallUsersOnlineComponent(
      TestBed.inject(DataService),
      TestBed.inject(LanguageService),
      TestBed.inject(LiveKitWebSocketService),
    ));
  });

  it('does not send its own register event - the socket service already registers on every connect, and this call raced against that async connection, firing before the socket was open', () => {
    component.ngOnInit();

    expect(liveKitWebSocketServiceSpy.send).not.toHaveBeenCalled();
  });

  it('does not throw when the users request resolves synchronously (regression: this.subscription.add(usersSub) previously referenced usersSub inside its own subscribe callback, before the const assignment completed)', () => {
    expect(() => component.ngOnInit()).not.toThrow();
    expect(component.rowData).toEqual([]);
  });
});
