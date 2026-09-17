import { AppVersionService } from './app-version.service';
import { environment } from '../../environments/environment';

describe('AppVersionService', () => {
  let service: AppVersionService;

  beforeEach(() => {
    service = new AppVersionService();
  });

  it('flags a new version when the server header differs from the bundle\'s own baked-in version', () => {
    service.checkVersion('some-other-sha');

    expect(service.newVersionAvailable()).toBe(true);
  });

  it('does not flag when the header matches the bundled version', () => {
    service.checkVersion(environment.buildVersion);

    expect(service.newVersionAvailable()).toBe(false);
  });

  it('ignores a missing/null header rather than treating it as a mismatch', () => {
    service.checkVersion(null);

    expect(service.newVersionAvailable()).toBe(false);
  });

  it('stays flagged once set, even if a later response reports the old version again', () => {
    service.checkVersion('some-other-sha');
    service.checkVersion(environment.buildVersion);

    expect(service.newVersionAvailable()).toBe(true);
  });
});
