import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingButtonComponent } from './loading-button.component';

describe('LoadingButtonComponent', () => {
  let fixture: ComponentFixture<LoadingButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingButtonComponent);
  });

  it('shows the projected content and no spinner when not loading', () => {
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();

    const content = fixture.nativeElement.querySelector('.loading-button-content');
    expect(content.classList.contains('loading-button-content--hidden')).toBe(false);
    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeNull();
  });

  it('hides the projected content and shows a spinner when loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const content = fixture.nativeElement.querySelector('.loading-button-content');
    expect(content.classList.contains('loading-button-content--hidden')).toBe(true);
    expect(fixture.nativeElement.querySelector('mat-spinner')).not.toBeNull();
  });
});
