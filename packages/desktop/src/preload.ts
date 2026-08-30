import { contextBridge, ipcRenderer } from 'electron';

// Only attached to the setup window - the main window loads the user's own
// server as plain remote content and never gets this bridge, so the web app
// itself needs zero changes to run inside this shell.
contextBridge.exposeInMainWorld('desktopShell', {
  saveServerUrl: (url: string): Promise<void> => ipcRenderer.invoke('save-server-url', url),
});
