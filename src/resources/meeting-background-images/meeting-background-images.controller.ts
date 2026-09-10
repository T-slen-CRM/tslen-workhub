import { Controller, Delete, Get, MaxFileSizeValidator, ParseFilePipe, ParseIntPipe, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Request } from 'express';
import { MeetingBackgroundImagesService } from './meeting-background-images.service';
import { MeetingBackgroundImage } from './entities/meeting-background-image.entity';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';
import { FileExtensionValidatorPipe } from '../users/pipes/file-extension-validator.pipe';

@Controller('meeting-background-images')
export class MeetingBackgroundImagesController {
    constructor (private readonly meetingBackgroundImagesService: MeetingBackgroundImagesService) {}

    @Get()
    findAll (@User() user: Users): Promise<MeetingBackgroundImage[]> {
        return this.meetingBackgroundImagesService.findAllForUser(user.id);
    }

    @Post()
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './upload/meeting-background-images',
            filename: (req: Request, file: Express.Multer.File, cb) => {
                const hashedName = Math.random().toString(36).substring(2);
                cb(null, `${req['user']?.id}_${Date.now()}_${hashedName}`);
            }
        })
    }))
    upload (
        @User() user: Users,
        @UploadedFile(
            new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 })] }), // 2MB
            new FileExtensionValidatorPipe()
        ) file: Express.Multer.File,
    ): Promise<MeetingBackgroundImage> {
        return this.meetingBackgroundImagesService.upload(user, file);
    }

    @Delete(':id')
    remove (
        @Param('id', ParseIntPipe) id: number,
        @User() user: Users,
    ): Promise<void> {
        return this.meetingBackgroundImagesService.remove(id, user.id);
    }
}
