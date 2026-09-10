import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { MeetingBackgroundImagesRepository } from './meeting-background-images.repository';
import { MeetingBackgroundImage } from './entities/meeting-background-image.entity';
import { Users } from '../users/entities/users.entity';
import { UploadAbstractService } from '../../common/services/upload/upload.abstract.service';

@Injectable()
export class MeetingBackgroundImagesService extends BaseAbstractService<MeetingBackgroundImage> {
    constructor (
        protected readonly repository: MeetingBackgroundImagesRepository,
        private readonly uploadService: UploadAbstractService,
    ) {
        super(repository, null);
        this.currentRepository = repository;
    }

    async upload (user: Users, file: Express.Multer.File): Promise<MeetingBackgroundImage> {
        const imageUrl: string[] = await this.uploadService.uploadImage(file, 'meetingBackgrounds/');
        return await this.repository.create({
            userId: user.id,
            url: imageUrl[0],
            originName: file.originalname,
            type: file.mimetype,
        });
    }

    findAllForUser (userId: number): Promise<MeetingBackgroundImage[]> {
        return this.repository.findAllForUser(userId);
    }

    async remove (id: number, userId: number): Promise<void> {
        const image = await this.repository.findOne(id);
        if (!image || image.userId !== userId) {
            throw new NotFoundException('Background image not found');
        }
        await this.repository.delete(id);
    }
}
