import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
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

  it('joins with the entered display name and switches to in-call state', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(of({ title: 'Standup', hostName: 'Ada Lovelace', roomName: 'meeting-abc' }));
    dataServiceSpy.joinMeetingAsGuest.and.returnValue(of({ livekitToken: 'guest-jwt', roomName: 'meeting-abc' }));
    fixture.componentRef.setInput('token', 'plain-token');
    fixture.detectChanges();

    component.displayNameControl.setValue('Visiting Guest');
    component.join();

    expect(dataServiceSpy.joinMeetingAsGuest).toHaveBeenCalledWith('plain-token', 'Visiting Guest');
    expect(component.state()).toBe('in-call');
    expect(component.connection()).toEqual({ livekitToken: 'guest-jwt', roomName: 'meeting-abc', displayName: 'Visiting Guest' });
  });

  it('shows a join error and stays on the join form when joining fails', () => {
    dataServiceSpy.getPublicMeetingLink.and.returnValue(of({ title: 'Standup', hostName: 'Ada Lovelace', roomName: 'meeting-abc' }));
    dataServiceSpy.joinMeetingAsGuest.and.returnValue(throwError(() => new Error('link revoked')));
    fixture.componentRef.setInput('token', 'plain-token');
    fixture.detectChanges();

    component.displayNameControl.setValue('Visiting Guest');
    component.join();

    expect(component.state()).toBe('ready');
    expect(component.connection()).toBeNull();
    expect(component.joinError()).toBe(true);
  });
});
