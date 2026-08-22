// Generates Angular's environment.ts (dev) and environment.prod.ts (prod)
// from the monorepo's single root .env file, so backend and frontend share
// one source of configuration truth. Runs automatically before `npm start`
// and `npm run prod` via the prestart/preprod npm lifecycle hooks; can also
// be invoked manually with `npm run config`.
//
// Uses require() rather than import: packages/web/tsconfig.json targets
// "module": "esnext" for the Angular app itself, which ts-node here would
// compile this script to as well if it used `import`, and Node's CommonJS
// loader can't execute the resulting `import` statements directly.
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const toBool = (value: string | undefined): boolean => value === 'true';

// ConfigurationService.getApiHost() prepends environment.protocol itself
// (`environment.protocol + hostname`), so apiHost must be a bare hostname -
// strip any scheme BACKEND_DOMAIN happens to carry (the backend's own code
// concatenates BACKEND_DOMAIN as a complete base URL and expects a scheme,
// so this repo's .env legitimately has both scheme-included and bare forms
// depending on where the value is set).
const stripScheme = (value: string): string => value.replace(/^https?:\/\//, '');

const apiVersion = process.env.API_VERSION || '1';

const shared = {
    isDemo: toBool(process.env.IS_DEMO),
    urlSufix: `/api/v${apiVersion}`,
    serverPort: process.env.APP_PORT || '4004',
    apiHost: process.env.BACKEND_DOMAIN ? stripScheme(process.env.BACKEND_DOMAIN) : '',
    ipCheckerUrl: process.env.IP_CHECKER_URL || '',
    ftpDomain: process.env.FTP_DOMAIN || '',
    livekitUrl: process.env.LIVEKIT_PUBLIC_URL || '',
};

interface Target {
    fileName: string;
    production: boolean;
    protocol: string;
}

const targets: Target[] = [
    { fileName: 'environment.ts', production: false, protocol: 'http://' },
    { fileName: 'environment.prod.ts', production: true, protocol: 'https://' },
];

const render = (target: Target): string => `export const environment = {
  isDemo: ${shared.isDemo},
  production: ${target.production},
  protocol: '${target.protocol}',
  urlSufix: '${shared.urlSufix}',
  serverPort: '${shared.serverPort}',
  apiHost: '${shared.apiHost}',
  ipCheckerUrl: '${shared.ipCheckerUrl}',
  ftpDomain: '${shared.ftpDomain}',
  livekitUrl: '${shared.livekitUrl}',
};
`;

for (const target of targets) {
    const targetPath = path.resolve(__dirname, 'src/environments', target.fileName);
    fs.writeFileSync(targetPath, render(target));
    console.log(`Generated ${targetPath}`);
}
