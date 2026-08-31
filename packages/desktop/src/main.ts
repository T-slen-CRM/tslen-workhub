import { app, BrowserWindow, Menu, MenuItemConstructorOptions, ipcMain, shell } from 'electron';
import * as path from 'path';
import { readConfig, writeConfig } from './config-store';

let mainWindow: BrowserWindow | null = null;
let setupWindow: BrowserWindow | null = null;

function buildMenu(): void {
  const isMac = process.platform === 'darwin';
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { label: 'Change Server…', click: () => openSetupWindow() },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    }] : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'close' as const },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createMainWindow(serverUrl: string): void {
  const { windowBounds } = readConfig();
  mainWindow = new BrowserWindow({
    width: windowBounds?.width ?? 1280,
    height: windowBounds?.height ?? 800,
    x: windowBounds?.x,
    y: windowBounds?.y,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  void mainWindow.loadURL(serverUrl);

  const persistBounds = (): void => {
    if (mainWindow) {
      writeConfig({ windowBounds: mainWindow.getBounds() });
    }
  };
  mainWindow.on('resize', persistBounds);
  mainWindow.on('move', persistBounds);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Google OAuth (Calendar sync) and any other target="_blank" link should
  // open in the user's real browser, not inside this app's own window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
}

function openSetupWindow(): void {
  if (setupWindow) {
    setupWindow.focus();
    return;
  }
  const { serverUrl } = readConfig();
  setupWindow = new BrowserWindow({
    width: 480,
    height: 320,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  setupWindow.setMenuBarVisibility(false);
  void setupWindow.loadFile(path.join(__dirname, 'setup.html'), {
    search: serverUrl ? `current=${encodeURIComponent(serverUrl)}` : undefined,
  });
  setupWindow.on('closed', () => {
    setupWindow = null;
  });
}

ipcMain.handle('save-server-url', (_event, url: string) => {
  writeConfig({ serverUrl: url });
  setupWindow?.close();
  if (mainWindow) {
    void mainWindow.loadURL(url);
  } else {
    createMainWindow(url);
  }
});

app.whenReady().then(() => {
  buildMenu();
  const { serverUrl } = readConfig();
  if (serverUrl) {
    createMainWindow(serverUrl);
  } else {
    openSetupWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const { serverUrl: currentUrl } = readConfig();
      if (currentUrl) {
        createMainWindow(currentUrl);
      } else {
        openSetupWindow();
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
