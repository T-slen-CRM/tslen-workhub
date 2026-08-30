import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

interface WindowBounds {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

interface DesktopConfig {
  serverUrl?: string;
  windowBounds?: WindowBounds;
}

function configFilePath(): string {
  return path.join(app.getPath('userData'), 'config.json');
}

export function readConfig(): DesktopConfig {
  try {
    const raw = fs.readFileSync(configFilePath(), 'utf-8');
    return JSON.parse(raw) as DesktopConfig;
  } catch {
    // Missing on first run, or unreadable/corrupt - either way, fall back to
    // "nothing saved yet" rather than crash the app over a config file.
    return {};
  }
}

export function writeConfig(patch: Partial<DesktopConfig>): void {
  const next: DesktopConfig = { ...readConfig(), ...patch };
  try {
    fs.writeFileSync(configFilePath(), JSON.stringify(next, null, 2));
  } catch {
    // Best-effort only - losing server-url/window-bounds persistence isn't
    // fatal, the app just falls back to the setup screen / default size.
  }
}
