import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationBellComponent } from './notification-bell.component';
import { DataService } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';
import { LiveKitWebSocketService } from '../../pages/live-kit/live-kitWebSocket.service';

describe('NotificationBellComponent', () => {
  let fixture: ComponentFixture<NotificationBellComponent>;
  let component: NotificationBellComponent;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let notificationService: NotificationService;
  let notificationSubject: Subject<any>;

  const existingNotification = {
    id: 1, title: 'New message', message: 'hi', isRead: 0, createdAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    dataServiceSpy = jasmine.createSpyObj('DataService', ['getObservableData', 'updateData', 'postData']);
    dataServiceSpy.getObservableData.and.returnValue(of([existingNotification]));
    notificationSubject = new Subject();

    await TestBed.configureTestingModule({
      imports: [NotificationBellComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataService, useValue: dataServiceSpy },
        { provide: LiveKitWebSocketService, useValue: { notification$: notificationSubject.asObservable() } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    // Real singleton service (providedIn: 'root') so multi-instance tests exercise the
    // actual BehaviorSubject-backed shared state, not a mock of it.
    notificationService = TestBed.inject(NotificationService);

    fixture = TestBed.createComponent(NotificationBellComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('userId', 7);
  });

  it('loads existing notifications and computes the unread count on init', () => {
    fixture.detectChanges();

    expect(dataServiceSpy.getObservableData).toHaveBeenCalledWith('/notifications');
    expect(component.notifications.length).toBe(1);
    expect(component.unreadNotiCount).toBe(1);
  });

  it('prepends a live notification and increments the unread count when one arrives', () => {
    fixture.detectChanges();

    const live = { id: 2, title: 'New message', message: 'another one', isRead: 0, createdAt: new Date().toISOString() };
    notificationSubject.next(live);

    expect(component.notifications[0].id).toBe(2);
    expect(component.unreadNotiCount).toBe(2);
  });

  it('does not produce a negative elapsed time for a live notification (stale `today` regression)', () => {
    fixture.detectChanges();

    // createdAt is "now" at the moment the live notification arrives, so a fresh `today`
    // computed at call time must never see a negative elapsed duration.
    const live = { id: 2, title: 'New message', message: 'another one', isRead: 0, createdAt: new Date().toISOString() };
    notificationSubject.next(live);

    expect(component.notifications[0].time).not.toContain('-');
  });

  it('stops applying live notifications after the component is destroyed', () => {
    fixture.detectChanges();

    const notificationsBefore = component.notifications;
    const unreadCountBefore = component.unreadNotiCount;

    fixture.destroy();

    const live = { id: 3, title: 'New message', message: 'after destroy', isRead: 0, createdAt: new Date().toISOString() };
    notificationSubject.next(live);

    expect(component.notifications).toBe(notificationsBefore);
    expect(component.unreadNotiCount).toBe(unreadCountBefore);
  });

  it('marks all as read and clears the unread count', () => {
    dataServiceSpy.postData.and.returnValue(of({}) as never);
    fixture.detectChanges();

    component.markAsRead();

    expect(dataServiceSpy.postData).toHaveBeenCalledWith('/notifications/mark-as-read', [1]);
    expect(component.unreadNotiCount).toBeNull();
  });

  describe('shared state across mounted bell instances', () => {
    it('only fetches notifications once across two mounted instances', () => {
      const fixture1 = TestBed.createComponent(NotificationBellComponent);
      fixture1.componentRef.setInput('userId', 7);
      fixture1.detectChanges();

      const fixture2 = TestBed.createComponent(NotificationBellComponent);
      fixture2.componentRef.setInput('userId', 7);
      fixture2.detectChanges();

      expect(dataServiceSpy.getObservableData).toHaveBeenCalledTimes(1);
      expect(fixture2.componentInstance.notifications.length).toBe(1);
      expect(fixture2.componentInstance.unreadNotiCount).toBe(1);
    });

    it('reflects a markAsRead() call made through one instance in a second, independently mounted instance', () => {
      dataServiceSpy.postData.and.returnValue(of({}) as never);

      const fixture1 = TestBed.createComponent(NotificationBellComponent);
      fixture1.componentRef.setInput('userId', 7);
      fixture1.detectChanges();

      const fixture2 = TestBed.createComponent(NotificationBellComponent);
      fixture2.componentRef.setInput('userId', 7);
      fixture2.detectChanges();

      fixture1.componentInstance.markAsRead();

      expect(fixture2.componentInstance.unreadNotiCount).toBeNull();
      expect(fixture2.componentInstance.notifications.every((item) => item.isRead === 1)).toBeTrue();
    });

    it('reflects a clearAll() call made through one instance in a second, independently mounted instance', () => {
      dataServiceSpy.postData.and.returnValue(of({}) as never);

      const fixture1 = TestBed.createComponent(NotificationBellComponent);
      fixture1.componentRef.setInput('userId', 7);
      fixture1.detectChanges();

      const fixture2 = TestBed.createComponent(NotificationBellComponent);
      fixture2.componentRef.setInput('userId', 7);
      fixture2.detectChanges();

      fixture1.componentInstance.clearAll();

      expect(fixture2.componentInstance.notifications.length).toBe(0);
      expect(fixture2.componentInstance.unreadNotiCount).toBeNull();
    });

    it('reflects a live notification arriving via one instance in a second, independently mounted instance', () => {
      const fixture1 = TestBed.createComponent(NotificationBellComponent);
      fixture1.componentRef.setInput('userId', 7);
      fixture1.detectChanges();

      const fixture2 = TestBed.createComponent(NotificationBellComponent);
      fixture2.componentRef.setInput('userId', 7);
      fixture2.detectChanges();

      const live = { id: 2, title: 'New message', message: 'another one', isRead: 0, createdAt: new Date().toISOString() };
      notificationSubject.next(live);

      // Both instances are subscribed to the same underlying socket stream; only one of
      // them should actually process the event and push to shared state, or the live
      // notification would be double-counted/duplicated across the two instances.
      expect(fixture2.componentInstance.notifications[0].id).toBe(2);
      expect(fixture2.componentInstance.notifications.length).toBe(2);
      expect(fixture2.componentInstance.unreadNotiCount).toBe(2);
    });
  });
});
