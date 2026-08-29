import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

import './jasmine-compat';

// jsdom's HTMLMediaElement.play() is a stub that returns undefined (logging
// "Not implemented"), not a Promise like a real browser - code that does
// `new Audio(...).play().catch(...)` (e.g. NotificationService) throws
// synchronously under jsdom without this.
window.HTMLMediaElement.prototype.play = () => Promise.resolve();
window.HTMLMediaElement.prototype.pause = () => undefined;

// jsdom has no navigator.mediaDevices at all (undefined) - code that does
// `navigator.mediaDevices.addEventListener('devicechange', ...)` (e.g.
// PreJoinLobbyComponent) throws synchronously under jsdom without this. A
// plain EventTarget is enough for addEventListener/removeEventListener/
// dispatchEvent; nothing under test calls the real enumerateDevices/
// getUserMedia through this object (those go through livekit-client, which
// specs mock directly).
Object.defineProperty(navigator, 'mediaDevices', { value: new EventTarget(), writable: true, configurable: true });
