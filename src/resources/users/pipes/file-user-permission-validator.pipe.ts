import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class FileUserPermissionValidatorPipe implements PipeTransform {
    transform (file: Express.Multer.File, metadata: ArgumentMetadata): Express.Multer.File | Error {
        console.log('file', file, metadata);
        return file

    }
}
