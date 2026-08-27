import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TranslateModule } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTabGroupHarness } from '@angular/material/tabs/testing';
import { LiveKitComponent } from './live-kit.component';

@Component({ selector: 'app-live-kit-table', template: '' })
class StubLiveKitTableComponent {}

@Component({ selector: 'app-live-chat', template: '' })
class StubLiveChatComponent {}

@Component({ selector: 'app-meeting-links-manager', template: '' })
class StubMeetingLinksManagerComponent {}

describe('LiveKitComponent', () => {
  let fixture: ComponentFixture<LiveKitComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [LiveKitComponent, TranslateModule.forRoot(), NoopAnimationsModule],
    });
    TestBed.overrideComponent(LiveKitComponent, {
      set: {
        imports: [
          MatTabsModule,
          TranslateModule,
          StubLiveKitTableComponent,
          StubLiveChatComponent,
          StubMeetingLinksManagerComponent,
        ],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(LiveKitComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('renders the existing 1:1 calls content (user list + chat) in the first tab', () => {
    const table = fixture.nativeElement.querySelector('app-live-kit-table');
    const chat = fixture.nativeElement.querySelector('app-live-chat');

    expect(table).toBeTruthy();
    expect(chat).toBeTruthy();
  });

  it('exposes both areas as separate tabs', async () => {
    const tabGroup = await loader.getHarness(MatTabGroupHarness);
    const tabs = await tabGroup.getTabs();
    const labels = await Promise.all(tabs.map((tab) => tab.getLabel()));

    expect(labels).toEqual(['navigation.tslen_meet', 'meeting_links.title']);
  });

  it('renders the meeting links manager once its tab is selected', async () => {
    const tabGroup = await loader.getHarness(MatTabGroupHarness);
    await tabGroup.selectTab({ label: 'meeting_links.title' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const manager = fixture.nativeElement.querySelector('app-meeting-links-manager');

    expect(manager).toBeTruthy();
  });
});
