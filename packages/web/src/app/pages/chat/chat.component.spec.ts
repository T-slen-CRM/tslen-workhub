import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrService } from 'ngx-toastr';
import { Subject, of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { ChatComponent } from './chat.component';
import { ChatService } from './chat.service';

describe('ChatComponent', () => {
  let component: ChatComponent;
  let fixture: ComponentFixture<ChatComponent>;
  let chatServiceSpy: jasmine.SpyObj<ChatService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let messagesSubject: Subject<{ senderId: string; chatRoomId: string; content: string; timestamp: string }>;

  beforeEach(async () => {
    messagesSubject = new Subject();
    chatServiceSpy = jasmine.createSpyObj('ChatService', ['listenForEvents', 'sendMessage', 'connect', 'disconnect']);
    chatServiceSpy.getMessages = jasmine.createSpy().and.returnValue(messagesSubject.asObservable());
    chatServiceSpy.getChatHistory = jasmine.createSpy().and.returnValue(of());
    chatServiceSpy.getConnectedStatus = jasmine.createSpy().and.returnValue(of());
    chatServiceSpy.getErrors = jasmine.createSpy().and.returnValue(of());

    toastrSpy = jasmine.createSpyObj('ToastrService', ['info']);

    await TestBed.configureTestingModule({
      imports: [ChatComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ChatService, useValue: chatServiceSpy },
        { provide: ToastrService, useValue: toastrSpy },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('opens exactly one chat connection for the room when the component mounts', () => {
    fixture.componentRef.setInput('chatRoomId', 'room-1');
    fixture.componentRef.setInput('localUserId', 42);

    fixture.detectChanges();
    TestBed.flushEffects();

    const callsForRoom = chatServiceSpy.listenForEvents.calls.allArgs()
      .filter(([roomId]) => roomId === 'room-1');
    expect(callsForRoom.length).toBe(1);
  });

  describe('incoming message notifications', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('chatRoomId', 'room-1');
      fixture.componentRef.setInput('localUserId', 42);
      fixture.componentRef.setInput('senderName', 'Jane Doe');
      fixture.detectChanges();
    });

    function emitMessage (senderId: string, content = 'hi there') {
      messagesSubject.next({ senderId, chatRoomId: 'room-1', content, timestamp: new Date().toISOString() });
    }

    it('shows a toast for a message from someone else while the tab is hidden', () => {
      spyOnProperty(document, 'hidden').and.returnValue(true);

      emitMessage('7');

      expect(toastrSpy.info).toHaveBeenCalledTimes(1);
      expect(toastrSpy.info.calls.mostRecent().args[0]).toContain('hi there');
      expect(toastrSpy.info.calls.mostRecent().args[1]).toBe('Jane Doe');
    });

    it('does not show a toast when the tab is visible', () => {
      spyOnProperty(document, 'hidden').and.returnValue(false);

      emitMessage('7');

      expect(toastrSpy.info).not.toHaveBeenCalled();
    });

    it('does not show a toast for the local user\'s own message', () => {
      spyOnProperty(document, 'hidden').and.returnValue(true);

      emitMessage('42');

      expect(toastrSpy.info).not.toHaveBeenCalled();
    });
  });
});
