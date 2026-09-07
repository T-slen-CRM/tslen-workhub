import { BadRequestException } from '@nestjs/common';
import { FilesExtensionValidatorPipe } from '../../../../src/common/pipes/files-extension-validator.pipe';

describe('FilesExtensionValidatorPipe', () => {
    const pipe = new FilesExtensionValidatorPipe();

    const fileWithMimetype = (mimetype: string): Express.Multer.File =>
        ({ mimetype } as Express.Multer.File);

    it('accepts jpg/jpeg/png files', () => {
        const files = [
            fileWithMimetype('image/jpeg'),
            fileWithMimetype('image/png'),
        ];

        expect(pipe.transform(files)).toEqual(files);
    });

    it('accepts gif files - the upload dialog advertises image/gif as an accepted type', () => {
        const files = [fileWithMimetype('image/gif')];

        expect(pipe.transform(files)).toEqual(files);
    });

    // The old behavior threw a plain Error, which NestJS has no mapping for
    // and serializes as a generic 500 "Internal server error" - indistinguishable
    // from a real backend crash instead of a clear "unsupported file type" message.
    it('rejects a disallowed extension with a BadRequestException, not a raw Error', () => {
        const files = [fileWithMimetype('application/pdf')];

        expect(() => pipe.transform(files)).toThrow(BadRequestException);
    });
});
