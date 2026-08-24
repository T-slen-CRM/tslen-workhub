module.exports = {
  preset: 'jest-preset-angular',
  // css-animator ships an ESM-only build; the preset's own default already
  // carves out .mjs files and @angular/common/locales, extend it rather than
  // replace it.
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$|@angular/common/locales/.*\\.js$|css-animator/.*))'],
  setupFilesAfterEnv: [
    '<rootDir>/src/test-setup/setup-jest.ts',
  ],
  // tsconfig.json's baseUrl ("./") lets specs import via a project-root-relative
  // path (e.g. 'src/app/services/auth.service') instead of a relative path -
  // TypeScript resolves that from tsconfig alone, but Jest's own module
  // resolution needs to be told the same root explicitly.
  modulePaths: ['<rootDir>'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/'],
};
