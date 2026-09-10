import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MeetingBackgroundImagesController } from './meeting-background-images.controller';
import { MeetingBackgroundImagesService } from './meeting-background-images.service';
import { MeetingBackgroundImagesRepository } from './meeting-background-images.repository';
import { MeetingBackgroundImage } from './entities/meeting-background-image.entity';
import { UploadAbstractService } from '../../common/services/upload/upload.abstract.service';
import { FirebaseService } from '../../common/services/firebase/firebase.service';
import { FirebaseModule } from '../../common/services/firebase/firebase.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([MeetingBackgroundImage]),
        MulterModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                dest: configService.get<string>('MULTER_DEST'),
            }),
            inject: [ConfigService],
        }),
        FirebaseModule,
    ],
    controllers: [MeetingBackgroundImagesController],
    providers: [
        MeetingBackgroundImagesService,
        MeetingBackgroundImagesRepository,
        {
            provide: UploadAbstractService,
            useExisting: FirebaseService,
        },
    ],
})
export class MeetingBackgroundImagesModule {}
