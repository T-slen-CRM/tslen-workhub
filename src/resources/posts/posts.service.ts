import { Injectable } from '@nestjs/common';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { Posts } from './entities/post.entity';
import { BaseInterfaceService } from '../../common/services/base/base.interface.service';
import { PostsRepository } from './posts.repository';
import { UploadAbstractService } from '../../common/services/upload/upload.abstract.service';
import { ErrorExceptionMethod } from '../../common/services/error/error.service';


@Injectable()
export class PostsService extends BaseAbstractService<Posts> implements BaseInterfaceService{
    constructor (
    private readonly uploadService: UploadAbstractService,
    protected readonly repository: PostsRepository
    ) {
        super(repository, null);
        this.currentRepository = repository;
    }

    async addImage (file: Express.Multer.File) {
        try {
            const imageUrl: string[] = await this.uploadService.uploadImage(file, 'posts/');
            return { imageUrl: imageUrl[0] };
        }
        catch (e) {
            const errorMessage = `uploadFileToCDN: ${file.originalname}, class: ${this.constructor.name}. Message: ${e.message}`;
            const throwError = { method: ErrorExceptionMethod.NotFound, message: `Cannot upload file to CDN for: ${file.originalname}` };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }
}
