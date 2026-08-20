import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { NotificationService } from './notification.service';
import { DataService } from './data.service';
import { LiveKitWebSocketService } from '../pages/live-kit/live-kitWebSocket.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let notificationSubject: Subject<any>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;

  beforeEach(() => {
    notificationSubject = new Subject();
    toastrSpy = jasmine.createSpyObj('ToastrService', ['info']);
    dataServiceSpy = jasmine.createSpyObj('DataService', ['getObservableData']);
    dataServiceSpy.getObservableData.and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        { provide: DataService, useValue: dataServiceSpy },
        { provide: LiveKitWebSocketService, useValue: { notification$: notificationSubject.asObservable() } },
        { provide: ToastrService, useValue: toastrSpy },
      ],
    });

    service = TestBed.inject(NotificationService);
  });

  it('shows a global toast with the notification title and message when a live notification arrives', () => {
    const live = {
      id: 1, title: 'You were assigned a task', message: 'Ann assigned you to "Ship it"',
      isRead: 0, createdAt: new Date().toISOString(),
    };

    notificationSubject.next(live);

    expect(toastrSpy.info).toHaveBeenCalledWith(live.message, live.title);
  });

  it('plays a sound when a live notification arrives', () => {
    spyOn(window, 'Audio').and.callThrough();
    const live = {
      id: 1, title: 'You were assigned a task', message: 'hi',
      isRead: 0, createdAt: new Date().toISOString(),
    };

    notificationSubject.next(live);

    expect(window.Audio).toHaveBeenCalledWith('assets/audio/join.mp3');
  });
});
