import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { LocalVideoTrack } from 'livekit-client';
import { JoinMeetingLinkComponent } from './join-meeting-link.component';
import { DataService } from '../../../services/data.service';
import { AuthenticationService } from '../../../services/auth.service';
import { ActiveMeetingCallService } from '../active-meeting-call.service';

describe('JoinMeetingLinkComponent', () => {
  let component: JoinMeetingLinkComponent;
  let fixture: ComponentFixture<JoinMeetingLinkComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let activeMeetingCall: ActiveMeetingCallService;

  beforeEach(async () => {
    dataServiceSpy = jasmine.createSpyObj('DataService', ['getPublicMeetingLink', 'sendToken']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [JoinMeetingLinkComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataService, useValue: dataServiceSpy },
        { provide: AuthenticationService, useValue: { authDataSignal: () => ({ firstName: 'Ada', lastName: 'Lovelace' }) } },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JoinMeetingLinkComponent);
    component = fixture.componentInstance;
    activeMeetingCall = TestBed.inject(ActiveMeetingCallService);
  });

  it('shows the pre-join lobby once the shared link resolves', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(of({ title: 'Standup', hostName: 'Grace Hopper', roomName: 'meeting-abc' }));
    fixture.componentRef.setInput('token', 'plain-token');

    fixture.detectChanges();

    expect(component.state()).toBe('lobby');
    expect(component.hostDisplayName()).toBe('Ada-Lovelace');
  });

  it('shows an invalid state when the link is unknown or expired', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(throwError(() => new Error('not found')));
    fixture.componentRef.setInput('token', 'bad-token');

    fixture.detectChanges();

    expect(component.state()).toBe('invalid');
  });

  it('mints an authenticated token, hands the call off to the app shell overlay, then returns to the live-kit page', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(of({ title: 'Standup', hostName: 'Grace Hopper', roomName: 'meeting-abc' }));
    dataServiceSpy.sendToken.and.returnValue(of({ token: 'self-jwt' }));
    fixture.componentRef.setInput('token', 'plain-token');
    fixture.detectChanges();
    const fakeVideoTrack = { sid: 'v1' } as unknown as LocalVideoTrack;

    component.onLobbyJoined({ videoTrack: fakeVideoTrack, audioTrack: undefined, backgroundEffect: 'blur' });

    expect(dataServiceSpy.sendToken).toHaveBeenCalledWith('/api/token', { roomName: 'meeting-abc', participantName: 'Ada-Lovelace' });
    expect(activeMeetingCall.activeCall()).toEqual({
      livekitToken: 'self-jwt', roomName: 'meeting-abc', displayName: 'Ada-Lovelace', videoTrack: fakeVideoTrack, audioTrack: undefined,
      backgroundEffect: 'blur', backgroundImage: undefined,
    });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/pages/live-kit']);
  });

  it('shows a join error and lets the lobby retry when minting the token fails', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(of({ title: 'Standup', hostName: 'Grace Hopper', roomName: 'meeting-abc' }));
    dataServiceSpy.sendToken.and.returnValue(throwError(() => new Error('livekit unavailable')));
    fixture.componentRef.setInput('token', 'plain-token');
    fixture.detectChanges();
    const lobbyStub = jasmine.createSpyObj('PreJoinLobbyComponent', ['resumeAfterFailedJoin']);

    component.onLobbyJoined({ videoTrack: undefined, audioTrack: undefined, backgroundEffect: 'none' }, lobbyStub);

    expect(component.state()).toBe('lobby');
    expect(component.joinError()).toBe(true);
    expect(activeMeetingCall.activeCall()).toBeNull();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
    expect(lobbyStub.resumeAfterFailedJoin).toHaveBeenCalled();
  });
});
