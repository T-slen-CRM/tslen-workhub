import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ALLOWED_FILE_EXTENSIONS } from '../utils/file-settings';
@Injectable()
export class FilesExtensionValidatorPipe implements PipeTransform {
    transform (files: Express.Multer.File[]): Express.Multer.File[] {
        const result = [];
        for (const file of files) {
            const extension = file.mimetype.split('/')[1];
            if (ALLOWED_FILE_EXTENSIONS.includes(extension)){
                result.push(file);
            } else {
                // A plain Error here has no NestJS exception mapping, so it
                // serializes as a generic 500 - indistinguishable from a real
                // crash instead of a clear "unsupported file type" message.
                throw new BadRequestException(`File extension ".${extension}" is not allowed`);
            }
        }
        return result;
    }
}
