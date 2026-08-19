import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { LoadingLogoComponent } from './loading-logo.component';

describe('LoadingLogoComponent', () => {
  let fixture: ComponentFixture<LoadingLogoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoadingLogoComponent],
      imports: [CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingLogoComponent);
  });

  it('does not render the overlay when isLoading is false', () => {
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.overlay')).toBeNull();
  });

  it('renders the overlay scoped to its container by default', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.classList.contains('overlay--fixed')).toBe(false);
  });

  it('renders the overlay viewport-wide when fixed is true', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.componentRef.setInput('fixed', true);
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.overlay');
    expect(overlay.classList.contains('overlay--fixed')).toBe(true);
  });
});
