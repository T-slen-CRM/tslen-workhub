// angular.json's "assets" glob copy requires inputs to live inside this
// workspace root (a hard Angular CLI constraint), but npm's hoisting of
// @kolkov/angular-editor between the repo root and this package's own
// node_modules isn't stable across installs (observed to flip depending on
// lockfile history) — so a relative node_modules path here would be
// correct only sometimes. require.resolve finds the real location either
// way, and the icons are copied in before `ng build`/`ng serve` run.
const fs = require('fs');
const path = require('path');

const source = path.dirname(require.resolve('@kolkov/angular-editor/package.json'));
const dest = path.join(__dirname, '..', '.vendor-assets', 'ae-icons');

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(path.join(source, 'assets', 'icons'), dest, { recursive: true });
