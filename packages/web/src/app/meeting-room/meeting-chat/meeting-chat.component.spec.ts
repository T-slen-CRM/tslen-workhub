import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MeetingChatComponent } from './meeting-chat.component';

describe('MeetingChatComponent', () => {
  let component: MeetingChatComponent;
  let fixture: ComponentFixture<MeetingChatComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MeetingChatComponent, TranslateModule.forRoot()],
    });

    fixture = TestBed.createComponent(MeetingChatComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('messages', []);
    fixture.detectChanges();
  });

  it('renders the message history handed down from the meeting room', () => {
    fixture.componentRef.setInput('messages', [
      { senderName: 'Bob', text: 'hi', ts: 123 },
      { senderName: 'Ada', text: 'hello', ts: 124 },
    ]);
    fixture.detectChanges();

    const rendered = fixture.nativeElement.textContent as string;
    expect(rendered).toContain('Bob');
    expect(rendered).toContain('hi');
    expect(rendered).toContain('Ada');
    expect(rendered).toContain('hello');
  });

  it('emits the trimmed draft and clears the input when sending', () => {
    const emitted: string[] = [];
    component.messageSent.subscribe((text) => emitted.push(text));
    component.draft = '  hello there  ';

    component.send();

    expect(emitted).toEqual(['hello there']);
    expect(component.draft).toBe('');
  });

  it('does not emit an empty or whitespace-only message', () => {
    const emitted: string[] = [];
    component.messageSent.subscribe((text) => emitted.push(text));
    component.draft = '   ';

    component.send();

    expect(emitted).toEqual([]);
  });
});
