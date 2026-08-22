import { Injectable } from '@angular/core';
import { VideoTrack } from 'livekit-client';

export interface PictureInPictureHandles {
  getMainVideoTrack: () => VideoTrack | null;
  getSelfVideoTrack: () => VideoTrack | null;
  isMicEnabled: () => boolean;
  onToggleMic: () => void;
  onLeave: () => void;
}

@Injectable({ providedIn: 'root' })
export class PictureInPictureService {
  readonly isSupported: boolean = typeof (window as any).documentPictureInPicture !== 'undefined';

  private pipWindow?: Window;
  private mainVideoEl?: HTMLVideoElement;
  private selfVideoEl?: HTMLVideoElement;
  private handles?: PictureInPictureHandles;
  private opening = false;

  isActive(): boolean {
    return !!this.pipWindow;
  }

  async open(handles: PictureInPictureHandles): Promise<void> {
    if (!this.isSupported || this.isActive() || this.opening) {
      return;
    }
    this.opening = true;
    const wasHiddenAtRequestTime = document.visibilityState === 'hidden';

    let pipWindow: Window;
    try {
      pipWindow = await (window as any).documentPictureInPicture.requestWindow({ width: 300, height: 220 });
    } catch {
      // Browser declined to open the window for any reason (no user
      // activation, feature disabled, etc.) - fall back to no PiP.
      this.opening = false;
      return;
    }
    this.opening = false;

    // Only the auto-trigger path (which starts while the tab is hidden)
    // needs to guard against the tab becoming visible again mid-request
    // (a fast tab switch back, or visibility flickering while the user
    // interacts with the PiP window itself) - a manual open() call, which
    // starts while the tab is already visible, must not be closed by this
    // check or the window would open and immediately self-close.
    if (wasHiddenAtRequestTime && document.visibilityState === 'visible') {
      pipWindow.close();
      return;
    }

    this.pipWindow = pipWindow;
    this.handles = handles;
    this.buildContent(pipWindow, handles);
    pipWindow.addEventListener('pagehide', () => this.close());
  }

  close(): void {
    if (!this.pipWindow) {
      return;
    }
    const mainTrack = this.handles?.getMainVideoTrack();
    const selfTrack = this.handles?.getSelfVideoTrack();
    if (mainTrack && this.mainVideoEl) {
      mainTrack.detach(this.mainVideoEl);
    }
    if (selfTrack && this.selfVideoEl) {
      selfTrack.detach(this.selfVideoEl);
    }
    if (!this.pipWindow.closed) {
      this.pipWindow.close();
    }
    this.pipWindow = undefined;
    this.mainVideoEl = undefined;
    this.selfVideoEl = undefined;
    this.handles = undefined;
  }

  private buildContent(pipWindow: Window, handles: PictureInPictureHandles): void {
    const doc = pipWindow.document;
    doc.body.style.margin = '0';
    doc.body.style.background = '#121212';
    doc.body.style.position = 'relative';
    doc.body.style.overflow = 'hidden';

    this.mainVideoEl = doc.createElement('video');
    this.mainVideoEl.autoplay = true;
    this.mainVideoEl.style.width = '100%';
    this.mainVideoEl.style.height = '100%';
    this.mainVideoEl.style.objectFit = 'cover';
    doc.body.appendChild(this.mainVideoEl);
    handles.getMainVideoTrack()?.attach(this.mainVideoEl);

    this.selfVideoEl = doc.createElement('video');
    this.selfVideoEl.autoplay = true;
    this.selfVideoEl.muted = true;
    this.selfVideoEl.style.position = 'absolute';
    this.selfVideoEl.style.bottom = '8px';
    this.selfVideoEl.style.right = '8px';
    this.selfVideoEl.style.width = '80px';
    this.selfVideoEl.style.height = '60px';
    this.selfVideoEl.style.objectFit = 'cover';
    this.selfVideoEl.style.borderRadius = '4px';
    doc.body.appendChild(this.selfVideoEl);
    handles.getSelfVideoTrack()?.attach(this.selfVideoEl);

    const controls = doc.createElement('div');
    controls.style.position = 'absolute';
    controls.style.bottom = '8px';
    controls.style.left = '8px';
    controls.style.display = 'flex';
    controls.style.gap = '8px';
    doc.body.appendChild(controls);

    const micButton = doc.createElement('button');
    const renderMicLabel = () => { micButton.textContent = handles.isMicEnabled() ? '🎤' : '🔇'; };
    renderMicLabel();
    micButton.addEventListener('click', () => {
      handles.onToggleMic();
      renderMicLabel();
    });
    controls.appendChild(micButton);

    const leaveButton = doc.createElement('button');
    leaveButton.textContent = '☎';
    leaveButton.addEventListener('click', () => handles.onLeave());
    controls.appendChild(leaveButton);
  }
}
