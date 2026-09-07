import * as fs from 'fs';
import * as path from 'path';
import { UploadFilesComponent } from './upload-files.component';

describe('UploadFilesComponent', () => {
  const component = new UploadFilesComponent({} as never);

  describe('formatsHint', () => {
    // Derived from acceptedFileTypes rather than hardcoded, so it can't
    // drift the way ALLOWED_FILE_EXTENSIONS and this input once did (the
    // file picker advertised image/gif while the backend's allowlist
    // didn't include it, producing a confusing 500 on upload).
    it('turns a comma-separated mime-type list into a friendly extension list', () => {
      component.acceptedFileTypes = 'image/png, image/jpeg, image/gif';

      expect(component.formatsHint).toBe('PNG, JPEG, GIF');
    });

    it('is empty when no accepted types are configured', () => {
      component.acceptedFileTypes = undefined;

      expect(component.formatsHint).toBe('');
    });
  });

  describe('task.form.allowed_formats translation coverage', () => {
    const locales = ['en', 'ru', 'uk', 'fr', 'es'];

    for (const locale of locales) {
      it(`has a task.form.allowed_formats key in ${locale}.json`, () => {
        const translations = JSON.parse(
          fs.readFileSync(path.join(__dirname, `../../../assets/i18n/${locale}.json`), 'utf8'),
        );

        expect(translations.task?.form?.allowed_formats).toBeDefined();
      });
    }
  });
});
