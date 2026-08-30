import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// app.getPath is called lazily inside readConfig/writeConfig (not cached at
// import time), so this closure just needs to read the current value of
// userDataDir - no need to re-require the module under test per test.
let userDataDir: string;

jest.mock('electron', () => ({
  app: {
    getPath: () => userDataDir,
  },
}));

import { readConfig, writeConfig } from './config-store';

describe('config-store', () => {
  beforeEach(() => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tslen-desktop-test-'));
  });

  afterEach(() => {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  });

  it('returns an empty object when no config file exists yet (first run)', () => {
    expect(readConfig()).toEqual({});
  });

  it('returns an empty object when the config file contains invalid JSON, instead of throwing', () => {
    fs.writeFileSync(path.join(userDataDir, 'config.json'), '{not valid json');

    expect(readConfig()).toEqual({});
  });

  it('round-trips a saved serverUrl', () => {
    writeConfig({ serverUrl: 'https://crm.example.com' });

    expect(readConfig()).toEqual({ serverUrl: 'https://crm.example.com' });
  });

  it('merges a partial update instead of clobbering previously saved fields', () => {
    writeConfig({ serverUrl: 'https://crm.example.com' });
    writeConfig({ windowBounds: { width: 1280, height: 800 } });

    expect(readConfig()).toEqual({
      serverUrl: 'https://crm.example.com',
      windowBounds: { width: 1280, height: 800 },
    });
  });
});
