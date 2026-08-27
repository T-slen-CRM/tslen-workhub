import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { MeetingLinksManagerComponent } from './meeting-links-manager.component';
import { DataService } from '../../services/data.service';
import { AuthenticationService } from '../../services/auth.service';

describe('MeetingLinksManagerComponent', () => {
  let component: MeetingLinksManagerComponent;
  let fixture: ComponentFixture<MeetingLinksManagerComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;

  const existingLink = { id: 1, title: 'Standup', roomName: 'meeting-abc', expiresAt: null, revokedAt: null, createdAt: '2026-08-27T00:00:00.000Z' };

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

  it('joining an existing link mints a host LiveKit token for that roomName', () => {
    dataServiceSpy.sendToken.and.returnValue(of({ token: 'host-livekit-jwt' }));

    component.joinOwnMeeting(existingLink);

    expect(dataServiceSpy.sendToken).toHaveBeenCalledWith('/api/token', { roomName: 'meeting-abc', participantName: 'Ada-Lovelace' });
    expect(component.activeRoom()).toEqual({ livekitToken: 'host-livekit-jwt', roomName: 'meeting-abc', displayName: 'Ada-Lovelace' });
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

  it('warns via toastr when joining a meeting fails', () => {
    dataServiceSpy.sendToken.and.returnValue(throwError(() => new Error('server error')));

    component.joinOwnMeeting(existingLink);

    expect(toastrSpy.warning).toHaveBeenCalled();
  });

  it('clears the just-created banner when that same link is revoked', () => {
    dataServiceSpy.createMeetingLink.and.returnValue(of({ id: 2, token: 'plain-token', roomName: 'meeting-def', title: 'Retro', expiresAt: null }));
    component.create();
    expect(component.justCreatedLink()).toBe(`${window.location.origin}/meet/plain-token`);

    dataServiceSpy.revokeMeetingLink.and.returnValue(of(undefined));
    component.revoke(2);

    expect(component.justCreatedLink()).toBeNull();
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
