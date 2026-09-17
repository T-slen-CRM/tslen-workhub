import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

// Tracks whether the backend has been redeployed to a version newer than
// the one this page's bundle was built from - VersionCheckInterceptor
// feeds it the X-App-Version header off every HTTP response (see
// AppVersionMiddleware server-side), so detection rides on whatever
// request the user's own next action happens to make, no separate polling
// endpoint needed.
@Injectable({ providedIn: 'root' })
export class AppVersionService {
  private readonly _newVersionAvailable = signal(false);
  readonly newVersionAvailable = this._newVersionAvailable.asReadonly();

  checkVersion(serverVersion: string | null): void {
    if (serverVersion && serverVersion !== environment.buildVersion) {
      this._newVersionAvailable.set(true);
    }
  }
}
