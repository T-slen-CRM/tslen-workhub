// The Angular ESLint tooling (@angular-eslint/builder & friends) only
// *peer*-depends on eslint, and this repo's root .npmrc has
// legacy-peer-deps=true (needed for an unrelated conflict — see .npmrc),
// which makes npm skip the auto-nesting it would normally do to satisfy a
// peer version npm hoisted elsewhere doesn't meet. So under a plain
// `npm install`, these packages get hoisted to the repo root and their
// internal `require('eslint')` calls resolve root's eslint@8 (needed by
// the NestJS backend) instead of this package's own eslint@10 devDependency
// — `ng lint` then crashes because @angular-eslint/builder passes eslint 9+
// -only options into an eslint@8 instance. This links a real, local
// node_modules/eslint into each such package wherever npm put it, so they
// resolve the version they actually need. Runs on every install
// (package.json "postinstall") so it survives `npm ci` in CI/Docker too.
const fs = require('fs');
const path = require('path');

const ESLINT_PEER_DEPENDENTS = [
  '@angular-eslint/builder',
  '@angular-eslint/eslint-plugin',
  '@angular-eslint/eslint-plugin-template',
  '@angular-eslint/template-parser',
  '@angular-eslint/utils',
  'angular-eslint',
  'typescript-eslint',
];

const localEslintDir = path.dirname(require.resolve('eslint/package.json'));

for (const pkg of ESLINT_PEER_DEPENDENTS) {
  let pkgJsonPath;
  try {
    pkgJsonPath = require.resolve(`${pkg}/package.json`);
  } catch {
    continue; // not installed
  }
  const pkgDir = path.dirname(pkgJsonPath);
  const nestedEslintLink = path.join(pkgDir, 'node_modules', 'eslint');

  if (fs.existsSync(nestedEslintLink)) {
    const nestedVersion = require(path.join(nestedEslintLink, 'package.json')).version;
    if (nestedVersion === require(path.join(localEslintDir, 'package.json')).version) {
      continue; // already correct (e.g. this package isn't hoisted away from us)
    }
    fs.rmSync(nestedEslintLink, { recursive: true, force: true });
  }

  fs.mkdirSync(path.dirname(nestedEslintLink), { recursive: true });
  fs.symlinkSync(localEslintDir, nestedEslintLink, 'junction');
}
