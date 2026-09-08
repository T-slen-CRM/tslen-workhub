import { TestBed, ComponentFixture } from '@angular/core/testing';
import { VideoComponent } from './video.component';
import { LocalVideoTrack } from 'livekit-client';

describe('VideoComponent', () => {
  let fixture: ComponentFixture<VideoComponent>;
  let component: VideoComponent;

  function makeTrack(source: string): LocalVideoTrack {
    return {
      source,
      attach: jasmine.createSpy('attach'),
      detach: jasmine.createSpy('detach'),
    } as unknown as LocalVideoTrack;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [VideoComponent],
    });
    fixture = TestBed.createComponent(VideoComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('participantIdentity', 'Someone');
  });

  describe('getTransform', () => {
    it('mirrors the local camera preview', () => {
      fixture.componentRef.setInput('track', makeTrack('camera'));
      fixture.componentRef.setInput('local', true);
      fixture.detectChanges();

      expect(component.getTransform()).toBe('scaleX(-1)');
    });

    it('does not mirror a local screen share', () => {
      fixture.componentRef.setInput('track', makeTrack('screen_share'));
      fixture.componentRef.setInput('local', true);
      fixture.detectChanges();

      expect(component.getTransform()).toBe('none');
    });

    it('does not mirror a remote participant camera', () => {
      fixture.componentRef.setInput('track', makeTrack('camera'));
      fixture.componentRef.setInput('local', false);
      fixture.detectChanges();

      expect(component.getTransform()).toBe('none');
    });

    it('does not mirror a remote screen share', () => {
      fixture.componentRef.setInput('track', makeTrack('screen_share'));
      fixture.componentRef.setInput('local', false);
      fixture.detectChanges();

      expect(component.getTransform()).toBe('none');
    });
  });

  describe('fullscreen toggle', () => {
    // jsdom doesn't implement the Fullscreen API - document.fullscreenElement
    // isn't a real property to spy on, so it's stubbed directly per test and
    // restored after.
    let originalDescriptor: PropertyDescriptor | undefined;

    function setFullscreenElement(el: Element | null): void {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => el,
      });
    }

    beforeEach(() => {
      originalDescriptor = Object.getOwnPropertyDescriptor(document, 'fullscreenElement');
      fixture.componentRef.setInput('track', makeTrack('screen_share'));
      fixture.componentRef.setInput('local', true);
      fixture.detectChanges();
    });

    afterEach(() => {
      if (originalDescriptor) {
        Object.defineProperty(document, 'fullscreenElement', originalDescriptor);
      } else {
        delete (document as { fullscreenElement?: unknown }).fullscreenElement;
      }
    });

    it('requests fullscreen on this tile\'s own container, not an arbitrary <video>', async () => {
      const container = component.videoContainer()!.nativeElement;
      (container as unknown as { requestFullscreen: () => Promise<void> }).requestFullscreen = jasmine
        .createSpy('requestFullscreen')
        .and.resolveTo(undefined);
      setFullscreenElement(null);

      await component.toggleFullscreen();

      expect(container.requestFullscreen).toHaveBeenCalled();
    });

    it('exits fullscreen when this tile is already the fullscreen element', async () => {
      const container = component.videoContainer()!.nativeElement;
      document.exitFullscreen = jasmine.createSpy('exitFullscreen').and.resolveTo(undefined);
      setFullscreenElement(container);

      await component.toggleFullscreen();

      expect(document.exitFullscreen).toHaveBeenCalled();
    });

    it('syncs isFullscreen() to whether this tile is the fullscreen element', () => {
      const container = component.videoContainer()!.nativeElement;
      setFullscreenElement(container);

      component.onFullscreenChange();

      expect(component.isFullscreen()).toBe(true);
    });

    it('clears isFullscreen() when some other element (or nothing) is fullscreen', () => {
      component.isFullscreen.set(true);
      setFullscreenElement(null);

      component.onFullscreenChange();

      expect(component.isFullscreen()).toBe(false);
    });
  });
});
