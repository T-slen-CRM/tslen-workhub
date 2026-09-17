import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { NewVersionBannerComponent } from './new-version-banner.component';
import { AppVersionService } from '../../services/app-version.service';

describe('NewVersionBannerComponent', () => {
  let fixture: ComponentFixture<NewVersionBannerComponent>;
  let newVersionAvailable = false;

  beforeEach(() => {
    newVersionAvailable = false;
  });

  function createComponent(): void {
    TestBed.configureTestingModule({
      imports: [NewVersionBannerComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AppVersionService, useValue: { newVersionAvailable: () => newVersionAvailable } },
      ],
    });

    fixture = TestBed.createComponent(NewVersionBannerComponent);
    fixture.detectChanges();
  }

  it('stays hidden when no new version is available', () => {
    createComponent();

    expect(fixture.nativeElement.querySelector('.new-version-banner')).toBeNull();
  });

  it('shows the banner once a new version is detected', () => {
    newVersionAvailable = true;
    createComponent();

    expect(fixture.nativeElement.querySelector('.new-version-banner')).not.toBeNull();
  });

  it('calls refresh() (which reloads the page) when Refresh is clicked', () => {
    // window.location isn't mockable in this jsdom setup (its reload
    // method, and location itself, are both non-configurable) - spying on
    // the component's own thin wrapper instead still verifies the click is
    // wired to the reload action without fighting jsdom over a one-line
    // browser API call.
    newVersionAvailable = true;
    createComponent();
    spyOn(fixture.componentInstance, 'refresh');

    fixture.nativeElement.querySelector('.new-version-banner-refresh').click();

    expect(fixture.componentInstance.refresh).toHaveBeenCalled();
  });

  it('hides itself when dismissed, without calling refresh', () => {
    newVersionAvailable = true;
    createComponent();
    spyOn(fixture.componentInstance, 'refresh');

    fixture.nativeElement.querySelector('.new-version-banner-close').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.new-version-banner')).toBeNull();
    expect(fixture.componentInstance.refresh).not.toHaveBeenCalled();
  });
});
