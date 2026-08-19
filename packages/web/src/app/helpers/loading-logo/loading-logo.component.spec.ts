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

    expect(fixture.nativeElement.querySelector('.overlay')).not.toBeNull();
  });

  it('renders a non-blocking top bar instead of the overlay when bar is true', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.componentRef.setInput('bar', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.overlay')).toBeNull();
    expect(fixture.nativeElement.querySelector('.top-bar')).not.toBeNull();
  });

  it('does not render the top bar when isLoading is false', () => {
    fixture.componentRef.setInput('isLoading', false);
    fixture.componentRef.setInput('bar', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.top-bar')).toBeNull();
  });
});
