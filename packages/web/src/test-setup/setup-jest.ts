import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

import './jasmine-compat';

// jsdom's HTMLMediaElement.play() is a stub that returns undefined (logging
// "Not implemented"), not a Promise like a real browser - code that does
// `new Audio(...).play().catch(...)` (e.g. NotificationService) throws
// synchronously under jsdom without this.
window.HTMLMediaElement.prototype.play = () => Promise.resolve();
window.HTMLMediaElement.prototype.pause = () => undefined;
