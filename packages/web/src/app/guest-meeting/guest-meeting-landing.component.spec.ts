import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { LocalVideoTrack } from 'livekit-client';
import { GuestMeetingLandingComponent } from './guest-meeting-landing.component';
import { DataService } from '../services/data.service';

describe('GuestMeetingLandingComponent', () => {
  let component: GuestMeetingLandingComponent;
  let fixture: ComponentFixture<GuestMeetingLandingComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;

  beforeEach(async () => {
    dataServiceSpy = jasmine.createSpyObj('DataService', ['getPublicMeetingLink', 'joinMeetingAsGuest']);

    await TestBed.configureTestingModule({
      imports: [GuestMeetingLandingComponent, TranslateModule.forRoot()],
      providers: [{ provide: DataService, useValue: dataServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(GuestMeetingLandingComponent);
    component = fixture.componentInstance;
  });

  it('shows the join form for a valid token', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(of({ title: 'Standup', hostName: 'Ada Lovelace', roomName: 'meeting-abc' }));
    fixture.componentRef.setInput('token', 'plain-token');

    fixture.detectChanges();

    expect(component.state()).toBe('ready');
    expect(component.meetingInfo()?.hostName).toBe('Ada Lovelace');
  });

  it('shows an invalid state when the link is unknown or expired', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(throwError(() => new Error('not found')));
    fixture.componentRef.setInput('token', 'bad-token');

    fixture.detectChanges();

    expect(component.state()).toBe('invalid');
  });

  it('moves to the lobby with a valid display name, without calling the backend yet', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(of({ title: 'Standup', hostName: 'Ada Lovelace', roomName: 'meeting-abc' }));
    fixture.componentRef.setInput('token', 'plain-token');
    fixture.detectChanges();

    component.displayNameControl.setValue('Visiting Guest');
    component.continueToLobby();

    expect(component.state()).toBe('lobby');
    expect(dataServiceSpy.joinMeetingAsGuest).not.toHaveBeenCalled();
  });

  it('does not leave the join form when the display name is blank', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(of({ title: 'Standup', hostName: 'Ada Lovelace', roomName: 'meeting-abc' }));
    fixture.componentRef.setInput('token', 'plain-token');
    fixture.detectChanges();

    component.continueToLobby();

    expect(component.state()).toBe('ready');
  });

  it('mints a guest token once the lobby hands off, carrying its tracks into the call', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(of({ title: 'Standup', hostName: 'Ada Lovelace', roomName: 'meeting-abc' }));
    dataServiceSpy.joinMeetingAsGuest.and.returnValue(of({ livekitToken: 'guest-jwt', roomName: 'meeting-abc' }));
    fixture.componentRef.setInput('token', 'plain-token');
    fixture.detectChanges();
    component.displayNameControl.setValue('Visiting Guest');
    component.continueToLobby();
    const fakeVideoTrack = { sid: 'v1' } as unknown as LocalVideoTrack;

    component.onLobbyJoined({ videoTrack: fakeVideoTrack, audioTrack: undefined, backgroundEffect: 'blur' });

    expect(dataServiceSpy.joinMeetingAsGuest).toHaveBeenCalledWith('plain-token', 'Visiting Guest');
    expect(component.state()).toBe('in-call');
    expect(component.connection()).toEqual({
      livekitToken: 'guest-jwt', roomName: 'meeting-abc', displayName: 'Visiting Guest', videoTrack: fakeVideoTrack, audioTrack: undefined,
      backgroundEffect: 'blur', backgroundImage: undefined,
    });
  });

  it('shows a join error, stays in the lobby, and tells the lobby to resume (tracks stay live for a retry) when joining fails', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(of({ title: 'Standup', hostName: 'Ada Lovelace', roomName: 'meeting-abc' }));
    dataServiceSpy.joinMeetingAsGuest.and.returnValue(throwError(() => new Error('link revoked')));
    fixture.componentRef.setInput('token', 'plain-token');
    fixture.detectChanges();
    component.displayNameControl.setValue('Visiting Guest');
    component.continueToLobby();
    const lobbyStub = jasmine.createSpyObj('PreJoinLobbyComponent', ['resumeAfterFailedJoin']);

    component.onLobbyJoined({ videoTrack: undefined, audioTrack: undefined, backgroundEffect: 'none' }, lobbyStub);

    expect(component.state()).toBe('lobby');
    expect(component.connection()).toBeNull();
    expect(component.joinError()).toBe(true);
    expect(lobbyStub.resumeAfterFailedJoin).toHaveBeenCalled();
  });
});
