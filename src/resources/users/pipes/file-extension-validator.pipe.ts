import { Injectable, PipeTransform } from '@nestjs/common';
import { ALLOWED_FILE_EXTENSIONS } from '../../../common/utils/file-settings';

@Injectable()
export class FileExtensionValidatorPipe implements PipeTransform {
    transform (file: Express.Multer.File): Express.Multer.File | Error {
        const DEFAULT_ALLOWED_EXTENSIONS = ALLOWED_FILE_EXTENSIONS;
        const extension = file.mimetype.split('/')[1];
        if (DEFAULT_ALLOWED_EXTENSIONS.includes(extension)){
            return file;
        } else {
            throw new Error('File extension is not allowed');
        }
    }
}
