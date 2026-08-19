import { Injectable, PipeTransform } from '@nestjs/common';
import { ALLOWED_FILE_EXTENSIONS } from '../utils/file-settings';
@Injectable()
export class FilesExtensionValidatorPipe implements PipeTransform {
    transform (files: Express.Multer.File[]): Express.Multer.File[] | Error {
        const result = [];
        for (const file of files) {
            const extension = file.mimetype.split('/')[1];
            if (ALLOWED_FILE_EXTENSIONS.includes(extension)){
                result.push(file);
            } else {
                throw new Error('File extension is not allowed');
            }
        }
        return result;
    }
}
