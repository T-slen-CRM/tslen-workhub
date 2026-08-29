import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import * as livekitClient from 'livekit-client';
import * as trackProcessors from '@livekit/track-processors';
import { BACKGROUND_IMAGE_PRESETS, PreJoinLobbyComponent } from './pre-join-lobby.component';

jest.mock('livekit-client', () => ({
  ...jest.requireActual('livekit-client'),
  createLocalVideoTrack: jasmine.createSpy('createLocalVideoTrack'),
  createLocalAudioTrack: jasmine.createSpy('createLocalAudioTrack'),
  createAudioAnalyser: jasmine.createSpy('createAudioAnalyser').and.returnValue({
    calculateVolume: jasmine.createSpy('calculateVolume').and.returnValue(0),
    analyser: {},
    cleanup: jasmine.createSpy('cleanup'),
  }),
}));

jest.mock('@livekit/track-processors', () => ({
  ...jest.requireActual('@livekit/track-processors'),
  BackgroundProcessor: jasmine.createSpy('BackgroundProcessor'),
}));

describe('PreJoinLobbyComponent', () => {
  let component: PreJoinLobbyComponent;
  let fixture: ComponentFixture<PreJoinLobbyComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PreJoinLobbyComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(PreJoinLobbyComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('displayName', 'Ada');
  });

  it('acquires camera and mic preview tracks on init', async () => {
    const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
    const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
    (livekitClient.createLocalVideoTrack as jasmine.Spy).and.resolveTo(fakeVideoTrack);
    (livekitClient.createLocalAudioTrack as jasmine.Spy).and.resolveTo(fakeAudioTrack);

    await component.ngOnInit();

    expect(component.videoTrack()).toBe(fakeVideoTrack);
    expect(component.audioTrack()).toBe(fakeAudioTrack);
    expect(component.cameraEnabled()).toBe(true);
    expect(component.microphoneEnabled()).toBe(true);
  });

  it('turning the camera off stops and clears the video track', async () => {
    const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
    (livekitClient.createLocalVideoTrack as jasmine.Spy).and.resolveTo(fakeVideoTrack);
    (livekitClient.createLocalAudioTrack as jasmine.Spy).and.rejectWith(new Error('no mic in this test'));
    await component.ngOnInit();

    await component.setCameraEnabled(false);

    expect(fakeVideoTrack.stop).toHaveBeenCalled();
    expect(component.videoTrack()).toBeUndefined();
    expect(component.cameraEnabled()).toBe(false);
  });

  it('turning the camera back on re-acquires a fresh track', async () => {
    (livekitClient.createLocalAudioTrack as jasmine.Spy).and.rejectWith(new Error('no mic in this test'));
    const first = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
    const second = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
    (livekitClient.createLocalVideoTrack as jasmine.Spy).and.resolveTo(first);
    await component.ngOnInit();
    await component.setCameraEnabled(false);

    (livekitClient.createLocalVideoTrack as jasmine.Spy).and.resolveTo(second);
    await component.setCameraEnabled(true);

    expect(component.videoTrack()).toBe(second);
    expect(component.cameraEnabled()).toBe(true);
  });

  it('a camera permission failure disables only the camera toggle, not the mic', async () => {
    (livekitClient.createLocalVideoTrack as jasmine.Spy).and.rejectWith(new Error('Permission denied'));
    const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
    (livekitClient.createLocalAudioTrack as jasmine.Spy).and.resolveTo(fakeAudioTrack);

    await component.ngOnInit();

    expect(component.cameraEnabled()).toBe(false);
    expect(component.cameraError()).toBe(true);
    expect(component.microphoneEnabled()).toBe(true);
    expect(component.microphoneError()).toBe(false);
  });

  it('a microphone permission failure disables only the mic toggle, not the camera', async () => {
    const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
    (livekitClient.createLocalVideoTrack as jasmine.Spy).and.resolveTo(fakeVideoTrack);
    (livekitClient.createLocalAudioTrack as jasmine.Spy).and.rejectWith(new Error('Permission denied'));

    await component.ngOnInit();

    expect(component.microphoneEnabled()).toBe(false);
    expect(component.microphoneError()).toBe(true);
    expect(component.cameraEnabled()).toBe(true);
    expect(component.cameraError()).toBe(false);
  });

  it('an analyser initialization failure leaves the microphone on instead of reporting it unavailable', async () => {
    const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
    spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('no camera in this test'));
    spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);
    spyOn(livekitClient, 'createAudioAnalyser').and.callFake(() => { throw new Error('AudioContext construction failed'); });

    await component.ngOnInit();

    expect(component.audioTrack()).toBe(fakeAudioTrack);
    expect(component.microphoneEnabled()).toBe(true);
    expect(component.microphoneError()).toBe(false);
  });

  it('turning the mic off stops and clears the audio track', async () => {
    (livekitClient.createLocalVideoTrack as jasmine.Spy).and.rejectWith(new Error('no camera in this test'));
    const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
    (livekitClient.createLocalAudioTrack as jasmine.Spy).and.resolveTo(fakeAudioTrack);
    await component.ngOnInit();

    await component.setMicrophoneEnabled(false);

    expect(fakeAudioTrack.stop).toHaveBeenCalled();
    expect(component.audioTrack()).toBeUndefined();
    expect(component.microphoneEnabled()).toBe(false);
  });

  describe('audio level meter', () => {
    it('drives audioLevel from the analyser while the mic is on', async () => {
      spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('no camera in this test'));
      const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);
      const calculateVolume = jasmine.createSpy('calculateVolume').and.returnValue(0.42);
      const analyserCleanup = jasmine.createSpy('cleanup').and.resolveTo(undefined);
      (livekitClient.createAudioAnalyser as jasmine.Spy).and.returnValue({ calculateVolume, analyser: {} as AnalyserNode, cleanup: analyserCleanup });
      let rafCallback: FrameRequestCallback | undefined;
      spyOn(window, 'requestAnimationFrame').and.callFake((cb: FrameRequestCallback) => {
        rafCallback = cb;
        return 1;
      });

      await component.ngOnInit();
      rafCallback!(0);

      expect(livekitClient.createAudioAnalyser).toHaveBeenCalledWith(fakeAudioTrack);
      expect(component.audioLevel()).toBe(0.42);
    });

    it('stops the analyser and resets the level when the mic is turned off', async () => {
      spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('no camera in this test'));
      const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);
      const analyserCleanup = jasmine.createSpy('cleanup').and.resolveTo(undefined);
      (livekitClient.createAudioAnalyser as jasmine.Spy).and.returnValue({ calculateVolume: () => 0.9, analyser: {} as AnalyserNode, cleanup: analyserCleanup });
      spyOn(window, 'requestAnimationFrame').and.returnValue(1);
      spyOn(window, 'cancelAnimationFrame');
      await component.ngOnInit();

      await component.setMicrophoneEnabled(false);

      expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
      expect(analyserCleanup).toHaveBeenCalled();
      expect(component.audioLevel()).toBe(0);
    });
  });

  describe('background effect', () => {
    function fakeVideoTrackWithProcessor (): livekitClient.LocalVideoTrack {
      return {
        stop: jasmine.createSpy('stop'),
        setProcessor: jasmine.createSpy('setProcessor').and.resolveTo(undefined),
        stopProcessor: jasmine.createSpy('stopProcessor').and.resolveTo(undefined),
      } as unknown as livekitClient.LocalVideoTrack;
    }

    it('applies a blur processor when set to blur', async () => {
      const fakeVideoTrack = fakeVideoTrackWithProcessor();
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      const fakeProcessor = {} as trackProcessors.BackgroundProcessorWrapper;
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue(fakeProcessor);
      await component.ngOnInit();

      await component.setBackgroundEffect('blur');

      expect(trackProcessors.BackgroundProcessor).toHaveBeenCalledWith({ mode: 'background-blur', blurRadius: 10 });
      expect(fakeVideoTrack.setProcessor).toHaveBeenCalledWith(fakeProcessor);
      expect(component.backgroundEffect()).toBe('blur');
      expect(component.backgroundUnavailable()).toBe(false);
    });

    it('applies a virtual-background processor with the chosen image path when set to image', async () => {
      const fakeVideoTrack = fakeVideoTrackWithProcessor();
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);
      await component.ngOnInit();
      const preset = BACKGROUND_IMAGE_PRESETS[1];

      await component.setBackgroundEffect('image', preset.path);

      expect(trackProcessors.BackgroundProcessor).toHaveBeenCalledWith({ mode: 'virtual-background', imagePath: preset.path });
      expect(component.backgroundEffect()).toBe('image');
      expect(component.selectedBackgroundImage()).toBe(preset.path);
    });

    it('switching from blur to image swaps the processor mode', async () => {
      const fakeVideoTrack = fakeVideoTrackWithProcessor();
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);
      await component.ngOnInit();
      await component.setBackgroundEffect('blur');

      await component.setBackgroundEffect('image', BACKGROUND_IMAGE_PRESETS[0].path);

      expect(trackProcessors.BackgroundProcessor).toHaveBeenCalledWith({ mode: 'virtual-background', imagePath: BACKGROUND_IMAGE_PRESETS[0].path });
      expect(component.backgroundEffect()).toBe('image');
    });

    it('stops the processor when set back to none', async () => {
      const fakeVideoTrack = fakeVideoTrackWithProcessor();
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);
      await component.ngOnInit();
      await component.setBackgroundEffect('blur');

      await component.setBackgroundEffect('none');

      expect(fakeVideoTrack.stopProcessor).toHaveBeenCalled();
      expect(component.backgroundEffect()).toBe('none');
    });

    it('disables the effect without blocking the lobby when the processor fails to init', async () => {
      const fakeVideoTrack = {
        stop: jasmine.createSpy('stop'),
        setProcessor: jasmine.createSpy('setProcessor').and.rejectWith(new Error('WebGL unsupported')),
        stopProcessor: jasmine.createSpy('stopProcessor').and.resolveTo(undefined),
      } as unknown as livekitClient.LocalVideoTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);
      await component.ngOnInit();

      await component.setBackgroundEffect('blur');

      expect(component.backgroundEffect()).toBe('none');
      expect(component.backgroundUnavailable()).toBe(true);
    });

    it('is a no-op when there is no video track', async () => {
      spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('no camera in this test'));
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      const processorSpy = spyOn(trackProcessors, 'BackgroundProcessor');
      processorSpy.calls.reset();
      await component.ngOnInit();

      await component.setBackgroundEffect('blur');

      expect(processorSpy).not.toHaveBeenCalled();
      expect(component.backgroundEffect()).toBe('none');
    });
  });

  describe('preference persistence', () => {
    it('skips acquiring the camera when it was last left off', async () => {
      localStorage.setItem('preJoinLobbyPrefs', JSON.stringify({ cameraEnabled: false, microphoneEnabled: true, backgroundEffect: 'none' }));
      const createVideoSpy = spyOn(livekitClient, 'createLocalVideoTrack');
      createVideoSpy.calls.reset(); // spyOn() on an already-mocked export returns the same shared spy (Jest doesn't wrap a mock again), so clear the call history left by earlier tests in this file before asserting on it.
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));

      await component.ngOnInit();

      expect(createVideoSpy).not.toHaveBeenCalled();
      expect(component.cameraEnabled()).toBe(false);
    });

    it('re-applies a blur background on init when it was last left on', async () => {
      localStorage.setItem('preJoinLobbyPrefs', JSON.stringify({ cameraEnabled: true, microphoneEnabled: false, backgroundEffect: 'blur' }));
      const fakeVideoTrack = {
        stop: jasmine.createSpy('stop'),
        setProcessor: jasmine.createSpy('setProcessor').and.resolveTo(undefined),
        stopProcessor: jasmine.createSpy('stopProcessor').and.resolveTo(undefined),
      } as unknown as livekitClient.LocalVideoTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);

      await component.ngOnInit();

      expect(fakeVideoTrack.setProcessor).toHaveBeenCalled();
      expect(component.backgroundEffect()).toBe('blur');
    });

    it('re-applies a virtual-background image on init when it was last left on', async () => {
      const preset = BACKGROUND_IMAGE_PRESETS[2];
      localStorage.setItem('preJoinLobbyPrefs', JSON.stringify({ cameraEnabled: true, microphoneEnabled: false, backgroundEffect: 'image', backgroundImage: preset.path }));
      const fakeVideoTrack = {
        stop: jasmine.createSpy('stop'),
        setProcessor: jasmine.createSpy('setProcessor').and.resolveTo(undefined),
        stopProcessor: jasmine.createSpy('stopProcessor').and.resolveTo(undefined),
      } as unknown as livekitClient.LocalVideoTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);

      await component.ngOnInit();

      expect(trackProcessors.BackgroundProcessor).toHaveBeenCalledWith({ mode: 'virtual-background', imagePath: preset.path });
      expect(component.backgroundEffect()).toBe('image');
      expect(component.selectedBackgroundImage()).toBe(preset.path);
    });

    it('treats an old-format record with a boolean blurEnabled as backgroundEffect "blur"', async () => {
      localStorage.setItem('preJoinLobbyPrefs', JSON.stringify({ cameraEnabled: true, microphoneEnabled: false, blurEnabled: true }));
      const fakeVideoTrack = {
        stop: jasmine.createSpy('stop'),
        setProcessor: jasmine.createSpy('setProcessor').and.resolveTo(undefined),
        stopProcessor: jasmine.createSpy('stopProcessor').and.resolveTo(undefined),
      } as unknown as livekitClient.LocalVideoTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);

      await component.ngOnInit();

      expect(component.backgroundEffect()).toBe('blur');
    });

    it('defaults to camera and mic on, background off, when nothing is stored yet', async () => {
      const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);

      await component.ngOnInit();

      expect(component.cameraEnabled()).toBe(true);
      expect(component.microphoneEnabled()).toBe(true);
      expect(component.backgroundEffect()).toBe('none');
    });

    it('writes the current choice back to localStorage on every toggle', async () => {
      const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      await component.ngOnInit();

      await component.setCameraEnabled(false);

      const stored = JSON.parse(localStorage.getItem('preJoinLobbyPrefs')!);
      expect(stored.cameraEnabled).toBe(false);
    });

    it('turning the camera off resets the background effect, so re-enabling it does not claim a fresh unprocessed track has one applied', async () => {
      const fakeVideoTrack = {
        stop: jasmine.createSpy('stop'),
        setProcessor: jasmine.createSpy('setProcessor').and.resolveTo(undefined),
        stopProcessor: jasmine.createSpy('stopProcessor').and.resolveTo(undefined),
      } as unknown as livekitClient.LocalVideoTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);
      await component.ngOnInit();
      await component.setBackgroundEffect('blur');

      await component.setCameraEnabled(false);

      expect(component.backgroundEffect()).toBe('none');
    });

    it('turning the camera off does not clobber a persisted backgroundEffect="blur" preference', async () => {
      localStorage.setItem('preJoinLobbyPrefs', JSON.stringify({ cameraEnabled: true, microphoneEnabled: true, backgroundEffect: 'blur' }));
      const fakeVideoTrack = {
        stop: jasmine.createSpy('stop'),
        setProcessor: jasmine.createSpy('setProcessor').and.resolveTo(undefined),
        stopProcessor: jasmine.createSpy('stopProcessor').and.resolveTo(undefined),
      } as unknown as livekitClient.LocalVideoTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);
      await component.ngOnInit();
      expect(component.backgroundEffect()).toBe('blur');

      await component.setCameraEnabled(false);

      const stored = JSON.parse(localStorage.getItem('preJoinLobbyPrefs')!);
      expect(stored.backgroundEffect).toBe('blur');
    });
  });

  describe('rendered controls (Material)', () => {
    it('the camera button reflects cameraEnabled via the Material color input', async () => {
      const fakeVideoTrack = {
        stop: jasmine.createSpy('stop'),
        // VideoComponent's ngAfterViewInit/effect attach the track to the
        // rendered <video> element once fixture.detectChanges() runs below.
        attach: jasmine.createSpy('attach'),
        detach: jasmine.createSpy('detach'),
      } as unknown as livekitClient.LocalVideoTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      // Let ngOnInit settle first, then render once - calling ngOnInit()
      // directly AND driving it again via detectChanges() would trigger it
      // a second time, since Angular has no way to know the manual call
      // already happened.
      await component.ngOnInit();
      fixture.detectChanges();

      const cameraButton: HTMLButtonElement = fixture.nativeElement.querySelector('.pre-join-controls button');
      expect(cameraButton.classList.contains('mat-primary')).toBe(true);

      await component.setCameraEnabled(false);
      fixture.detectChanges();

      expect(cameraButton.classList.contains('mat-warn')).toBe(true);
    });
  });

  describe('async acquisition race guards', () => {
    it('discards and stops a stale camera acquisition when a newer toggle superseded it', async () => {
      let resolveFirst!: (track: livekitClient.LocalVideoTrack) => void;
      let resolveSecond!: (track: livekitClient.LocalVideoTrack) => void;
      spyOn(livekitClient, 'createLocalVideoTrack').and.callFake(() => new Promise((resolve) => {
        if (!resolveFirst) { resolveFirst = resolve; } else { resolveSecond = resolve; }
      }));
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      const initPromise = component.ngOnInit();

      const secondCallPromise = component.setCameraEnabled(true);

      const staleTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      const freshTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      resolveFirst(staleTrack);
      resolveSecond(freshTrack);
      await Promise.all([initPromise, secondCallPromise]);

      expect(component.videoTrack()).toBe(freshTrack);
      expect(staleTrack.stop).toHaveBeenCalled();
      expect(freshTrack.stop).not.toHaveBeenCalled();
    });

    it('stops a camera track that resolves after the component was already destroyed', async () => {
      let resolveTrack!: (track: livekitClient.LocalVideoTrack) => void;
      spyOn(livekitClient, 'createLocalVideoTrack').and.callFake(() => new Promise((resolve) => { resolveTrack = resolve; }));
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      const initPromise = component.ngOnInit();

      component.ngOnDestroy();
      const lateTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      resolveTrack(lateTrack);
      await initPromise;

      expect(lateTrack.stop).toHaveBeenCalled();
      expect(component.videoTrack()).toBeUndefined();
    });

    it('discards and stops a stale microphone acquisition when a newer toggle superseded it', async () => {
      spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('no camera in this test'));
      let resolveFirst!: (track: livekitClient.LocalAudioTrack) => void;
      let resolveSecond!: (track: livekitClient.LocalAudioTrack) => void;
      spyOn(livekitClient, 'createLocalAudioTrack').and.callFake(() => new Promise((resolve) => {
        if (!resolveFirst) { resolveFirst = resolve; } else { resolveSecond = resolve; }
      }));
      const initPromise = component.ngOnInit();

      const secondCallPromise = component.setMicrophoneEnabled(true);

      const staleTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      const freshTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      resolveFirst(staleTrack);
      resolveSecond(freshTrack);
      await Promise.all([initPromise, secondCallPromise]);

      expect(component.audioTrack()).toBe(freshTrack);
      expect(staleTrack.stop).toHaveBeenCalled();
    });

    it('stops a microphone track that resolves after the component was already destroyed', async () => {
      spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('no camera in this test'));
      let resolveTrack!: (track: livekitClient.LocalAudioTrack) => void;
      spyOn(livekitClient, 'createLocalAudioTrack').and.callFake(() => new Promise((resolve) => { resolveTrack = resolve; }));
      const initPromise = component.ngOnInit();

      component.ngOnDestroy();
      const lateTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      resolveTrack(lateTrack);
      await initPromise;

      expect(lateTrack.stop).toHaveBeenCalled();
      expect(component.audioTrack()).toBeUndefined();
    });

    it('starts with Join disabled until initial device acquisition settles', async () => {
      spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('no camera in this test'));
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      expect(component.initializing()).toBe(true);

      await component.ngOnInit();

      expect(component.initializing()).toBe(false);
    });
  });

  describe('device selection', () => {
    const videoDeviceA = { deviceId: 'cam-a', kind: 'videoinput', label: 'Camera A' } as MediaDeviceInfo;
    const videoDeviceB = { deviceId: 'cam-b', kind: 'videoinput', label: 'Camera B' } as MediaDeviceInfo;
    const audioDeviceA = { deviceId: 'mic-a', kind: 'audioinput', label: 'Mic A' } as MediaDeviceInfo;

    it('populates the device lists after the initial camera/mic acquisition succeeds', async () => {
      const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);
      spyOn(livekitClient.Room, 'getLocalDevices').and.callFake((kind?: MediaDeviceKind) =>
        Promise.resolve(kind === 'videoinput' ? [videoDeviceA, videoDeviceB] : [audioDeviceA]));

      await component.ngOnInit();

      expect(component.videoDevices()).toEqual([videoDeviceA, videoDeviceB]);
      expect(component.audioDevices()).toEqual([audioDeviceA]);
    });

    it('selecting a different camera stops the old track and acquires the new device', async () => {
      const oldTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      const newTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      const createVideoSpy = spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(oldTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      spyOn(livekitClient.Room, 'getLocalDevices').and.resolveTo([]);
      await component.ngOnInit();
      createVideoSpy.and.resolveTo(newTrack);

      await component.selectVideoDevice('cam-b');

      expect(oldTrack.stop).toHaveBeenCalled();
      expect(createVideoSpy).toHaveBeenCalledWith({ deviceId: { ideal: 'cam-b' } });
      expect(component.videoTrack()).toBe(newTrack);
      expect(component.selectedVideoDeviceId()).toBe('cam-b');
    });

    it('selecting a camera while the camera is off just remembers the choice for later', async () => {
      localStorage.setItem('preJoinLobbyPrefs', JSON.stringify({ cameraEnabled: false, microphoneEnabled: false, backgroundEffect: 'none' }));
      spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('camera off in this test'));
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      spyOn(livekitClient.Room, 'getLocalDevices').and.resolveTo([]);
      await component.ngOnInit();
      const createVideoSpy = livekitClient.createLocalVideoTrack as jasmine.Spy;
      createVideoSpy.calls.reset();

      await component.selectVideoDevice('cam-b');

      expect(createVideoSpy).not.toHaveBeenCalled();
      expect(component.selectedVideoDeviceId()).toBe('cam-b');
    });

    it('selecting a camera resets the background effect, so a newly-selected unprocessed track is not claimed to have one applied', async () => {
      const oldTrack = {
        stop: jasmine.createSpy('stop'),
        setProcessor: jasmine.createSpy('setProcessor').and.resolveTo(undefined),
        stopProcessor: jasmine.createSpy('stopProcessor').and.resolveTo(undefined),
      } as unknown as livekitClient.LocalVideoTrack;
      const newTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      const createVideoSpy = spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(oldTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      spyOn(livekitClient.Room, 'getLocalDevices').and.resolveTo([]);
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);
      await component.ngOnInit();
      await component.setBackgroundEffect('blur');
      createVideoSpy.and.resolveTo(newTrack);

      await component.selectVideoDevice('cam-b');

      expect(component.backgroundEffect()).toBe('none');
    });

    it('persists the selected camera device id', async () => {
      const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      const createVideoSpy = spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      spyOn(livekitClient.Room, 'getLocalDevices').and.resolveTo([]);
      await component.ngOnInit();
      createVideoSpy.calls.reset();
      createVideoSpy.and.resolveTo(fakeVideoTrack);

      await component.selectVideoDevice('cam-b');

      const stored = JSON.parse(localStorage.getItem('preJoinLobbyPrefs')!);
      expect(stored.videoDeviceId).toBe('cam-b');
    });

    it('re-selects the persisted camera device id on the next init', async () => {
      localStorage.setItem('preJoinLobbyPrefs', JSON.stringify({ cameraEnabled: true, microphoneEnabled: false, backgroundEffect: 'none', videoDeviceId: 'cam-b' }));
      const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      const createVideoSpy = spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      spyOn(livekitClient.Room, 'getLocalDevices').and.resolveTo([]);

      await component.ngOnInit();

      expect(createVideoSpy).toHaveBeenCalledWith({ deviceId: { ideal: 'cam-b' } });
      expect(component.selectedVideoDeviceId()).toBe('cam-b');
    });

    it('selecting a different microphone stops the old track and acquires the new device', async () => {
      const oldTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      const newTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('no camera in this test'));
      const createAudioSpy = spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(oldTrack);
      spyOn(livekitClient.Room, 'getLocalDevices').and.resolveTo([]);
      await component.ngOnInit();
      createAudioSpy.and.resolveTo(newTrack);

      await component.selectMicrophoneDevice('mic-b');

      expect(oldTrack.stop).toHaveBeenCalled();
      expect(createAudioSpy).toHaveBeenCalledWith({ deviceId: { ideal: 'mic-b' } });
      expect(component.audioTrack()).toBe(newTrack);
      expect(component.selectedAudioDeviceId()).toBe('mic-b');
    });

    it('refreshes the device lists on a devicechange event', async () => {
      spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('no camera in this test'));
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      const getDevicesSpy = spyOn(livekitClient.Room, 'getLocalDevices').and.resolveTo([]);
      await component.ngOnInit();
      getDevicesSpy.calls.reset();
      getDevicesSpy.and.callFake((kind?: MediaDeviceKind) =>
        Promise.resolve(kind === 'videoinput' ? [videoDeviceA] : []));

      navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
      await Promise.resolve();
      await Promise.resolve();

      expect(component.videoDevices()).toEqual([videoDeviceA]);
    });

    it('removes the devicechange listener on destroy', async () => {
      spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('no camera in this test'));
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      spyOn(livekitClient.Room, 'getLocalDevices').and.resolveTo([]);
      const removeSpy = spyOn(navigator.mediaDevices, 'removeEventListener').and.callThrough();
      await component.ngOnInit();

      component.ngOnDestroy();

      expect(removeSpy).toHaveBeenCalledWith('devicechange', jasmine.any(Function));
    });
  });

  describe('joining', () => {
    it('emits the current tracks and background effect, and stops the level meter', async () => {
      const fakeVideoTrack = {
        stop: jasmine.createSpy('stop'),
        setProcessor: jasmine.createSpy('setProcessor').and.resolveTo(undefined),
      } as unknown as livekitClient.LocalVideoTrack;
      const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);
      spyOn(livekitClient, 'createAudioAnalyser').and.returnValue({ calculateVolume: () => 0, analyser: {} as AnalyserNode, cleanup: jasmine.createSpy('cleanup').and.resolveTo(undefined) });
      spyOn(window, 'requestAnimationFrame').and.returnValue(1);
      spyOn(window, 'cancelAnimationFrame');
      spyOn(trackProcessors, 'BackgroundProcessor').and.returnValue({} as trackProcessors.BackgroundProcessorWrapper);
      await component.ngOnInit();
      await component.setBackgroundEffect('blur');
      const joinedSpy = jasmine.createSpy('joined');
      component.joined.subscribe(joinedSpy);

      component.join();

      expect(joinedSpy).toHaveBeenCalledWith({ videoTrack: fakeVideoTrack, audioTrack: fakeAudioTrack, backgroundEffect: 'blur' });
      expect(window.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('emits undefined tracks for whichever device was left off', async () => {
      spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('camera off in this test'));
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('mic off in this test'));
      await component.ngOnInit();
      const joinedSpy = jasmine.createSpy('joined');
      component.joined.subscribe(joinedSpy);

      component.join();

      expect(joinedSpy).toHaveBeenCalledWith({ videoTrack: undefined, audioTrack: undefined, backgroundEffect: 'none' });
    });

    it('does not stop the handed-off tracks on destroy', async () => {
      const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);
      spyOn(livekitClient, 'createAudioAnalyser').and.returnValue({ calculateVolume: () => 0, analyser: {} as AnalyserNode, cleanup: jasmine.createSpy('cleanup').and.resolveTo(undefined) });
      spyOn(window, 'requestAnimationFrame').and.returnValue(1);
      spyOn(window, 'cancelAnimationFrame');
      await component.ngOnInit();
      component.join();

      component.ngOnDestroy();

      expect(fakeVideoTrack.stop).not.toHaveBeenCalled();
      expect(fakeAudioTrack.stop).not.toHaveBeenCalled();
    });

    it('stops any live tracks on destroy when the lobby was abandoned without joining', async () => {
      const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);
      spyOn(livekitClient, 'createAudioAnalyser').and.returnValue({ calculateVolume: () => 0, analyser: {} as AnalyserNode, cleanup: jasmine.createSpy('cleanup').and.resolveTo(undefined) });
      spyOn(window, 'requestAnimationFrame').and.returnValue(1);
      spyOn(window, 'cancelAnimationFrame');
      await component.ngOnInit();

      component.ngOnDestroy();

      expect(fakeVideoTrack.stop).toHaveBeenCalled();
      expect(fakeAudioTrack.stop).toHaveBeenCalled();
    });

    it('join() is a no-op if called again after already handing off', async () => {
      const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.rejectWith(new Error('no mic in this test'));
      await component.ngOnInit();
      const joinedSpy = jasmine.createSpy('joined');
      component.joined.subscribe(joinedSpy);

      component.join();
      component.join();

      expect(joinedSpy).toHaveBeenCalledTimes(1);
    });

    it('resumeAfterFailedJoin allows a later ngOnDestroy to stop tracks that were never actually handed off', async () => {
      const fakeVideoTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalVideoTrack;
      const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.resolveTo(fakeVideoTrack);
      spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);
      spyOn(livekitClient, 'createAudioAnalyser').and.returnValue({ calculateVolume: () => 0, analyser: {} as AnalyserNode, cleanup: jasmine.createSpy('cleanup').and.resolveTo(undefined) });
      spyOn(window, 'requestAnimationFrame').and.returnValue(1);
      spyOn(window, 'cancelAnimationFrame');
      await component.ngOnInit();
      component.join();

      component.resumeAfterFailedJoin();
      component.ngOnDestroy();

      expect(fakeVideoTrack.stop).toHaveBeenCalled();
      expect(fakeAudioTrack.stop).toHaveBeenCalled();
    });

    it('resumeAfterFailedJoin restarts the level meter if the mic is still enabled', async () => {
      const fakeAudioTrack = { stop: jasmine.createSpy('stop') } as unknown as livekitClient.LocalAudioTrack;
      spyOn(livekitClient, 'createLocalVideoTrack').and.rejectWith(new Error('no camera in this test'));
      spyOn(livekitClient, 'createLocalAudioTrack').and.resolveTo(fakeAudioTrack);
      const calculateVolume = jasmine.createSpy('calculateVolume').and.returnValue(0.5);
      spyOn(livekitClient, 'createAudioAnalyser').and.returnValue({ calculateVolume, analyser: {} as AnalyserNode, cleanup: jasmine.createSpy('cleanup').and.resolveTo(undefined) });
      let rafCallback: FrameRequestCallback | undefined;
      spyOn(window, 'requestAnimationFrame').and.callFake((cb: FrameRequestCallback) => { rafCallback = cb; return 1; });
      spyOn(window, 'cancelAnimationFrame');
      await component.ngOnInit();
      component.join();
      expect(component.audioLevel()).toBe(0);

      component.resumeAfterFailedJoin();
      rafCallback!(0);

      expect(component.audioLevel()).toBe(0.5);
    });
  });
});
