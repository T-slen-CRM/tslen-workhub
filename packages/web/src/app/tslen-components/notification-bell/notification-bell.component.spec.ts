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
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let notificationSubject: Subject<any>;

  const existingNotification = {
    id: 1, title: 'New message', message: 'hi', isRead: 0, createdAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    dataServiceSpy = jasmine.createSpyObj('DataService', ['getObservableData', 'updateData', 'postData']);
    dataServiceSpy.getObservableData.and.returnValue(of([existingNotification]));
    notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['timeSince', 'setCountUnreadNotifications'], {
      countUnreadNotifications: of(null),
    });
    notificationServiceSpy.timeSince.and.returnValue('5 minutes');
    notificationSubject = new Subject();

    await TestBed.configureTestingModule({
      imports: [NotificationBellComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataService, useValue: dataServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: LiveKitWebSocketService, useValue: { notification$: notificationSubject.asObservable() } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

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

  it('marks all as read and clears the unread count', () => {
    dataServiceSpy.postData.and.returnValue(of({}) as never);
    fixture.detectChanges();

    component.markAsRead();

    expect(dataServiceSpy.postData).toHaveBeenCalledWith('/notifications/mark-as-read', [1]);
    expect(component.unreadNotiCount).toBeNull();
  });
});
