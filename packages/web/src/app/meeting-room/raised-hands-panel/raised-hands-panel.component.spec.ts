import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RaisedHandsPanelComponent } from './raised-hands-panel.component';

describe('RaisedHandsPanelComponent', () => {
  let fixture: ComponentFixture<RaisedHandsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RaisedHandsPanelComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(RaisedHandsPanelComponent);
  });

  it('renders each entry in the order given', () => {
    fixture.componentRef.setInput('entries', [
      { identity: 'ada', name: 'Ada', ts: 1 },
      { identity: 'bob', name: 'Bob', ts: 2 },
    ]);

    fixture.detectChanges();

    const items: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(items.map((item) => item.textContent?.trim())).toEqual(['Ada', 'Bob']);
  });

  it('shows the empty state when no hands are raised', () => {
    fixture.componentRef.setInput('entries', []);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.raised-hands-empty')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('li').length).toBe(0);
  });
});
