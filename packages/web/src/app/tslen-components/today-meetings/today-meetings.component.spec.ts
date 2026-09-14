import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { TodayMeetingsComponent } from './today-meetings.component';
import { DataService } from '../../services/data.service';
import { AuthenticationService } from '../../services/auth.service';
import { JoinOwnMeetingService } from '../../pages/live-kit/join-own-meeting.service';
import { IEventByUser, UserGeneralData } from '../../interfaces/userConfig';

describe('TodayMeetingsComponent', () => {
  let fixture: ComponentFixture<TodayMeetingsComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let joinOwnMeetingServiceSpy: jasmine.SpyObj<JoinOwnMeetingService>;

  function makeEvent(overrides: Partial<IEventByUser>): IEventByUser {
    return {
      id: 1,
      title: 'Standup',
      start: '2026-09-10 09:00:00',
      end: '2026-09-10 09:15:00',
      isRequest: false,
      approved: 0,
      requestType: null,
      isGoogleEvent: false,
      googleMeetLink: null,
      meetingLink: null,
      ...overrides,
    };
  }

  function createComponent(eventsByUsers: IEventByUser[]): void {
    dataServiceSpy = jasmine.createSpyObj('DataService', ['getObservableData']);
    dataServiceSpy.getObservableData.and.returnValue(
      of({ eventsByUsers } as UserGeneralData),
    );
    joinOwnMeetingServiceSpy = jasmine.createSpyObj('JoinOwnMeetingService', ['join']);

    TestBed.configureTestingModule({
      imports: [TodayMeetingsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataService, useValue: dataServiceSpy },
        {
          provide: AuthenticationService,
          useValue: { authDataSignal: () => ({ id: 18 }) },
        },
        { provide: JoinOwnMeetingService, useValue: joinOwnMeetingServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TodayMeetingsComponent);
    fixture.detectChanges();
  }

  it('fetches the current user with a startDate/endDate query for today', () => {
    createComponent([]);

    const [path] = dataServiceSpy.getObservableData.calls.mostRecent().args;
    expect(path).toMatch(/^\/users\/18\?startDate=\d{4}-\d{2}-\d{2}&endDate=\d{4}-\d{2}-\d{2}$/);
  });

  it('shows each meeting\'s time and title, sorted earliest first', () => {
    createComponent([
      makeEvent({ id: 1, title: 'Afternoon sync', start: '2026-09-10 14:00:00' }),
      makeEvent({ id: 2, title: 'Standup', start: '2026-09-10 09:00:00' }),
    ]);

    const items = fixture.nativeElement.querySelectorAll('.today-meetings-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Standup');
    expect(items[1].textContent).toContain('Afternoon sync');
  });

  it('shows a Join link only for events with a Google Meet link', () => {
    createComponent([
      makeEvent({ id: 1, title: 'With link', googleMeetLink: 'https://meet.google.com/abc' }),
      makeEvent({ id: 2, title: 'No link', googleMeetLink: null }),
    ]);

    const links = fixture.nativeElement.querySelectorAll('.today-meetings-join');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe('https://meet.google.com/abc');
  });

  it('shows a Join action for an active TSLen meet link and joins it via JoinOwnMeetingService', () => {
    createComponent([
      makeEvent({
        id: 1,
        title: 'With tslen meet',
        meetingLink: { id: 5, roomName: 'meeting-abc', title: null, expiresAt: null, revokedAt: null },
      }),
    ]);

    const joinEls = fixture.nativeElement.querySelectorAll('.today-meetings-join');
    expect(joinEls.length).toBe(1);

    joinEls[0].click();
    expect(joinOwnMeetingServiceSpy.join).toHaveBeenCalledWith('meeting-abc');
  });

  it('hides the Join action once the TSLen meet link is expired', () => {
    createComponent([
      makeEvent({
        id: 1,
        title: 'Expired',
        meetingLink: { id: 5, roomName: 'meeting-abc', title: null, expiresAt: '2000-01-01T00:00:00.000Z', revokedAt: null },
      }),
    ]);

    expect(fixture.nativeElement.querySelectorAll('.today-meetings-join').length).toBe(0);
  });

  it('hides the Join action once the TSLen meet link is revoked', () => {
    createComponent([
      makeEvent({
        id: 1,
        title: 'Revoked',
        meetingLink: { id: 5, roomName: 'meeting-abc', title: null, expiresAt: null, revokedAt: '2026-09-10T00:00:00.000Z' },
      }),
    ]);

    expect(fixture.nativeElement.querySelectorAll('.today-meetings-join').length).toBe(0);
  });

  it('excludes day-off requests - they share the same table but are not meetings', () => {
    createComponent([
      makeEvent({ id: 1, title: 'Vacation', isRequest: true }),
      makeEvent({ id: 2, title: 'Real meeting', isRequest: false }),
    ]);

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('Vacation');
    expect(text).toContain('Real meeting');
  });

  it('crosses out a meeting once its end time has passed, but still shows it', () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    createComponent([
      makeEvent({ id: 1, title: 'Already over', start: past, end: past }),
      makeEvent({ id: 2, title: 'Still upcoming', start: future, end: future }),
    ]);

    const items: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.today-meetings-item'));
    const overItem = items.find((el) => el.textContent.includes('Already over'));
    const upcomingItem = items.find((el) => el.textContent.includes('Still upcoming'));

    expect(overItem.classList.contains('today-meetings-item--past')).toBe(true);
    expect(upcomingItem.classList.contains('today-meetings-item--past')).toBe(false);
  });

  it('shows an empty state when there are no meetings today', () => {
    createComponent([]);

    expect(fixture.nativeElement.querySelector('.today-meetings-empty')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.today-meetings-item')).toBeNull();
  });
});
