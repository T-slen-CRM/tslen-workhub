const setEnv = () => {
  const fs = require('fs');
  const writeFile = fs.writeFile;
// Configure Angular `environment.ts` file path
  const targetPath = './src/environments/environment.prod.ts';
// Load node modules
  require('dotenv').config({
    path: 'src/environments/.env'
  });
    const isDemo = process.env.IS_DEMO && process.env.IS_DEMO === 'true';
    const apiHost = process.env.API_HOST ? process.env.API_HOST : '';
    const ipCheckerUrl = process.env.IP_CHECKER_URL ? process.env.IP_CHECKER_URL : '';
    const ftpDomain = process.env.FTP_DOMAIN ? process.env.FTP_DOMAIN : '';
  console.log('process.env.API_HOST', process.env.API_HOST);
// `environment.ts` file structure
  const envConfigFile = `export const environment = {
  isDemo: ${isDemo},
  production: true,
  protocol: 'https://',
  urlSufix: '/api/v1',
  serverPort: '4004',
  apiHost: '${apiHost}',
  ipCheckerUrl: '${ipCheckerUrl}',
  ftpDomain: '${ftpDomain}',
};
`;
  writeFile(targetPath, envConfigFile, (err: any) => {
    if (err) {
      console.error(err);
      throw err;
    } else {
        console.log(`Angular environment.ts file generated correctly at ${targetPath} \n`);
    }
  });
};

setEnv();
