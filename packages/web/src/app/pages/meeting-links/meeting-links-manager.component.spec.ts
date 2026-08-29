import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { LocalVideoTrack } from 'livekit-client';
import { MeetingLinksManagerComponent } from './meeting-links-manager.component';
import { DataService } from '../../services/data.service';
import { AuthenticationService } from '../../services/auth.service';
import { ActiveMeetingCallService } from '../live-kit/active-meeting-call.service';

describe('MeetingLinksManagerComponent', () => {
  let component: MeetingLinksManagerComponent;
  let fixture: ComponentFixture<MeetingLinksManagerComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let activeMeetingCall: ActiveMeetingCallService;

  const existingLink = { id: 1, title: 'Standup', roomName: 'meeting-abc', expiresAt: null, revokedAt: null, createdAt: '2026-08-27T00:00:00.000Z', token: 'existing-plain-token' };

  beforeEach(async () => {
    dataServiceSpy = jasmine.createSpyObj('DataService', ['createMeetingLink', 'listMeetingLinks', 'revokeMeetingLink', 'sendToken']);
    dataServiceSpy.listMeetingLinks.and.returnValue(of([existingLink]));
    toastrSpy = jasmine.createSpyObj('ToastrService', ['success', 'warning']);

    await TestBed.configureTestingModule({
      imports: [MeetingLinksManagerComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataService, useValue: dataServiceSpy },
        { provide: AuthenticationService, useValue: { authDataSignal: () => ({ firstName: 'Ada', lastName: 'Lovelace' }) } },
        { provide: ToastrService, useValue: toastrSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MeetingLinksManagerComponent);
    component = fixture.componentInstance;
    activeMeetingCall = TestBed.inject(ActiveMeetingCallService);
    fixture.detectChanges();
  });

  it('loads the host\'s existing links on init', () => {
    expect(component.links()).toEqual([existingLink]);
  });

  it('creating a link shows the one-time shareable URL and refreshes the list', () => {
    dataServiceSpy.createMeetingLink.and.returnValue(of({ id: 2, token: 'plain-token', roomName: 'meeting-def', title: 'Retro', expiresAt: null }));
    component.titleDraft = 'Retro';

    component.create();

    expect(dataServiceSpy.createMeetingLink).toHaveBeenCalledWith({ title: 'Retro', expiresAt: undefined });
    expect(component.justCreatedLink()).toBe(`${window.location.origin}/meet/plain-token`);
    expect(dataServiceSpy.listMeetingLinks).toHaveBeenCalledTimes(2);
  });

  it('revoking a link calls the service and refreshes the list', () => {
    dataServiceSpy.revokeMeetingLink.and.returnValue(of(undefined));

    component.revoke(1);

    expect(dataServiceSpy.revokeMeetingLink).toHaveBeenCalledWith(1);
    expect(dataServiceSpy.listMeetingLinks).toHaveBeenCalledTimes(2);
  });

  it('opens the pre-join lobby for the clicked link without minting a token yet', () => {
    component.joinOwnMeeting(existingLink);

    expect(component.lobbyLink()).toEqual(existingLink);
    expect(dataServiceSpy.sendToken).not.toHaveBeenCalled();
  });

  it('mints a host LiveKit token once the lobby hands off, carrying its tracks into the call', () => {
    dataServiceSpy.sendToken.and.returnValue(of({ token: 'host-livekit-jwt' }));
    component.joinOwnMeeting(existingLink);
    const fakeVideoTrack = { sid: 'v1' } as unknown as LocalVideoTrack;

    component.onLobbyJoined({ videoTrack: fakeVideoTrack, audioTrack: undefined, backgroundEffect: 'none' });

    expect(dataServiceSpy.sendToken).toHaveBeenCalledWith('/api/token', { roomName: 'meeting-abc', participantName: 'Ada-Lovelace' });
    expect(activeMeetingCall.activeCall()).toEqual({
      livekitToken: 'host-livekit-jwt', roomName: 'meeting-abc', displayName: 'Ada-Lovelace', videoTrack: fakeVideoTrack, audioTrack: undefined,
      backgroundEffect: 'none', backgroundImage: undefined,
    });
    expect(component.lobbyLink()).toBeNull();
  });

  it('warns via toastr when refreshing the list fails', () => {
    dataServiceSpy.listMeetingLinks.and.returnValue(throwError(() => new Error('network down')));

    component.refresh();

    expect(toastrSpy.warning).toHaveBeenCalled();
  });

  it('warns via toastr when creating a link fails', () => {
    dataServiceSpy.createMeetingLink.and.returnValue(throwError(() => new Error('server error')));

    component.create();

    expect(toastrSpy.warning).toHaveBeenCalled();
  });

  it('warns via toastr when revoking a link fails', () => {
    dataServiceSpy.revokeMeetingLink.and.returnValue(throwError(() => new Error('server error')));

    component.revoke(1);

    expect(toastrSpy.warning).toHaveBeenCalled();
  });

  it('warns via toastr when joining a meeting fails, keeps the lobby open, and tells the lobby to resume', () => {
    dataServiceSpy.sendToken.and.returnValue(throwError(() => new Error('server error')));
    component.joinOwnMeeting(existingLink);
    const lobbyStub = jasmine.createSpyObj('PreJoinLobbyComponent', ['resumeAfterFailedJoin']);

    component.onLobbyJoined({ videoTrack: undefined, audioTrack: undefined, backgroundEffect: 'none' }, lobbyStub);

    expect(toastrSpy.warning).toHaveBeenCalled();
    expect(component.lobbyLink()).toEqual(existingLink);
    expect(lobbyStub.resumeAfterFailedJoin).toHaveBeenCalled();
  });

  it('clears the just-created banner when that same link is revoked', () => {
    dataServiceSpy.createMeetingLink.and.returnValue(of({ id: 2, token: 'plain-token', roomName: 'meeting-def', title: 'Retro', expiresAt: null }));
    component.create();
    expect(component.justCreatedLink()).toBe(`${window.location.origin}/meet/plain-token`);

    dataServiceSpy.revokeMeetingLink.and.returnValue(of(undefined));
    component.revoke(2);

    expect(component.justCreatedLink()).toBeNull();
  });

  it('converts the picked expiry date into an ISO string when creating a link', () => {
    dataServiceSpy.createMeetingLink.and.returnValue(of({ id: 3, token: 'plain-token', roomName: 'meeting-ghi', title: null, expiresAt: null }));
    const pickedDate = new Date('2026-09-01T00:00:00.000Z');
    component.expiresAtDraft = pickedDate;

    component.create();

    expect(dataServiceSpy.createMeetingLink).toHaveBeenCalledWith({ title: undefined, expiresAt: pickedDate.toISOString() });
  });

  it('clears the picked expiry date via clearExpiresAt', () => {
    component.expiresAtDraft = new Date();

    component.clearExpiresAt();

    expect(component.expiresAtDraft).toBeNull();
  });

  it('copies an existing link\'s meet URL (built from its redisplayed token) to the clipboard', async () => {
    const writeText = jasmine.createSpy('writeText').and.resolveTo(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await component.copyLink(existingLink);

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/meet/existing-plain-token`);
    expect(toastrSpy.success).toHaveBeenCalled();
  });

  it('warns instead of copying when a legacy link has no redisplayable token', async () => {
    const writeText = jasmine.createSpy('writeText').and.resolveTo(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const legacyLink = { ...existingLink, token: null };

    await component.copyLink(legacyLink);

    expect(writeText).not.toHaveBeenCalled();
    expect(toastrSpy.warning).toHaveBeenCalled();
  });

  it('leaves the just-created banner alone when a different link is revoked', () => {
    dataServiceSpy.createMeetingLink.and.returnValue(of({ id: 2, token: 'plain-token', roomName: 'meeting-def', title: 'Retro', expiresAt: null }));
    component.create();
    expect(component.justCreatedLink()).toBe(`${window.location.origin}/meet/plain-token`);

    dataServiceSpy.revokeMeetingLink.and.returnValue(of(undefined));
    component.revoke(1);

    expect(component.justCreatedLink()).toBe(`${window.location.origin}/meet/plain-token`);
  });
});
