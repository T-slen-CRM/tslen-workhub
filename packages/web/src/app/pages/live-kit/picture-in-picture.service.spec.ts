import { TestBed } from '@angular/core/testing';
import { PictureInPictureService, PictureInPictureHandles } from './picture-in-picture.service';

describe('PictureInPictureService', () => {
  let handles: PictureInPictureHandles;
  let mainTrack: { attach: jasmine.Spy; detach: jasmine.Spy };
  let selfTrack: { attach: jasmine.Spy; detach: jasmine.Spy };
  let originalDocumentPip: any;
  let originalVisibilityState: PropertyDescriptor | undefined;

  function setVisibilityState(state: 'visible' | 'hidden') {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  }

  function createFakePipWindow() {
    const listeners: Record<string, () => void> = {};
    return {
      document: document.implementation.createHTMLDocument('pip'),
      closed: false,
      close: jasmine.createSpy('close'),
      addEventListener: (event: string, cb: () => void) => { listeners[event] = cb; },
      __fireListener: (event: string) => listeners[event]?.(),
    };
  }

  beforeEach(() => {
    originalDocumentPip = (window as any).documentPictureInPicture;
    originalVisibilityState = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    setVisibilityState('hidden');

    mainTrack = jasmine.createSpyObj('mainTrack', ['attach', 'detach']);
    selfTrack = jasmine.createSpyObj('selfTrack', ['attach', 'detach']);
    handles = {
      getMainVideoTrack: () => mainTrack as any,
      getSelfVideoTrack: () => selfTrack as any,
      isMicEnabled: () => true,
      onToggleMic: jasmine.createSpy('onToggleMic'),
      onLeave: jasmine.createSpy('onLeave'),
    };
  });

  afterEach(() => {
    Object.defineProperty(window, 'documentPictureInPicture', { value: originalDocumentPip, configurable: true });
    if (originalVisibilityState) {
      Object.defineProperty(document, 'visibilityState', originalVisibilityState);
    }
  });

  describe('when documentPictureInPicture is unsupported', () => {
    let service: PictureInPictureService;

    beforeEach(() => {
      Object.defineProperty(window, 'documentPictureInPicture', { value: undefined, configurable: true });
      TestBed.configureTestingModule({ providers: [PictureInPictureService] });
      service = TestBed.inject(PictureInPictureService);
    });

    it('reports isSupported as false', () => {
      expect(service.isSupported).toBeFalse();
    });

    it('open() does not become active', async () => {
      await service.open(handles);
      expect(service.isActive()).toBeFalse();
    });
  });

  describe('when documentPictureInPicture is supported', () => {
    let service: PictureInPictureService;
    let fakePipWindow: ReturnType<typeof createFakePipWindow>;
    let requestWindowSpy: jasmine.Spy;

    beforeEach(() => {
      fakePipWindow = createFakePipWindow();
      requestWindowSpy = jasmine.createSpy('requestWindow').and.resolveTo(fakePipWindow);
      Object.defineProperty(window, 'documentPictureInPicture', { value: { requestWindow: requestWindowSpy }, configurable: true });

      TestBed.configureTestingModule({ providers: [PictureInPictureService] });
      service = TestBed.inject(PictureInPictureService);
    });

    it('reports isSupported as true', () => {
      expect(service.isSupported).toBeTrue();
    });

    it('attaches the main and self tracks to new video elements in the PiP window', async () => {
      await service.open(handles);

      expect(mainTrack.attach).toHaveBeenCalledWith(jasmine.any(HTMLVideoElement));
      expect(selfTrack.attach).toHaveBeenCalledWith(jasmine.any(HTMLVideoElement));
      expect(service.isActive()).toBeTrue();
    });

    it('does not request a second window if already active', async () => {
      await service.open(handles);
      await service.open(handles);

      expect(requestWindowSpy).toHaveBeenCalledTimes(1);
    });

    it('close() detaches both tracks and closes the window', async () => {
      await service.open(handles);

      service.close();

      expect(mainTrack.detach).toHaveBeenCalledWith(jasmine.any(HTMLVideoElement));
      expect(selfTrack.detach).toHaveBeenCalledWith(jasmine.any(HTMLVideoElement));
      expect(fakePipWindow.close).toHaveBeenCalled();
      expect(service.isActive()).toBeFalse();
    });

    it('close() is a no-op when not active', () => {
      expect(() => service.close()).not.toThrow();
    });

    it('closes automatically when the PiP window fires pagehide', async () => {
      await service.open(handles);

      fakePipWindow.__fireListener('pagehide');

      expect(service.isActive()).toBeFalse();
    });

    it('discards the window if the tab became visible again while requestWindow() was still pending', async () => {
      let resolveRequestWindow!: (win: unknown) => void;
      requestWindowSpy.and.returnValue(new Promise((resolve) => { resolveRequestWindow = resolve; }));

      const openPromise = service.open(handles);
      // Simulate returning to the main tab before requestWindow() resolves.
      setVisibilityState('visible');
      resolveRequestWindow(fakePipWindow);
      await openPromise;

      expect(service.isActive()).toBeFalse();
      expect(fakePipWindow.close).toHaveBeenCalled();
    });

    it('does not close a window opened manually while the tab was already visible (e.g. via a pop-out button)', async () => {
      setVisibilityState('visible');

      await service.open(handles);

      expect(service.isActive()).toBeTrue();
      expect(fakePipWindow.close).not.toHaveBeenCalled();
    });

    it('does not start a second requestWindow() while one is already pending', async () => {
      let resolveRequestWindow!: (win: unknown) => void;
      requestWindowSpy.and.returnValue(new Promise((resolve) => { resolveRequestWindow = resolve; }));

      const firstOpen = service.open(handles);
      const secondOpen = service.open(handles);
      resolveRequestWindow(fakePipWindow);
      await Promise.all([firstOpen, secondOpen]);

      expect(requestWindowSpy).toHaveBeenCalledTimes(1);
      expect(service.isActive()).toBeTrue();
    });

    it('the mic button click calls onToggleMic', async () => {
      await service.open(handles);
      const micButton = fakePipWindow.document.querySelectorAll('button')[0] as HTMLButtonElement;

      micButton.click();

      expect(handles.onToggleMic).toHaveBeenCalled();
    });

    it('the leave button click calls onLeave', async () => {
      await service.open(handles);
      const leaveButton = fakePipWindow.document.querySelectorAll('button')[1] as HTMLButtonElement;

      leaveButton.click();

      expect(handles.onLeave).toHaveBeenCalled();
    });

    it('falls back to inactive when requestWindow rejects (e.g. no user activation)', async () => {
      requestWindowSpy.and.rejectWith(new Error('NotAllowedError'));

      await service.open(handles);

      expect(service.isActive()).toBeFalse();
    });
  });
});
