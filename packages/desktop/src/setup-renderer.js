// Plain renderer-process script for setup.html - runs with nodeIntegration
// disabled, so the only way it talks to the main process is the
// window.desktopShell bridge preload.ts exposes via contextBridge.
const params = new URLSearchParams(window.location.search);
const existing = params.get('current');

const input = document.getElementById('url');
const errorEl = document.getElementById('error');
if (existing) {
  input.value = existing;
}

document.getElementById('form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const url = input.value.trim();
  errorEl.textContent = '';

  try {
    // eslint-disable-next-line no-new
    new URL(url);
  } catch {
    errorEl.textContent = 'Enter a valid URL, e.g. https://crm.example.com';
    return;
  }

  await window.desktopShell.saveServerUrl(url);
});
