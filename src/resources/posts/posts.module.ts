import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Posts } from './entities/post.entity';
import { PostsRepository } from './posts.repository';
import { RolesGuard } from '../../common/guards/roles/roles.guard';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UploadAbstractService } from '../../common/services/upload/upload.abstract.service';
import { FirebaseService } from '../../common/services/firebase/firebase.service';
import { FirebaseModule } from '../../common/services/firebase/firebase.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Posts]),
        FirebaseModule
    ],
    controllers: [PostsController],
    providers: [
        PostsService,
        PostsRepository,
        JwtService,
        {
            provide: APP_GUARD,
            useClass: RolesGuard,
        },
        {
            provide: UploadAbstractService,
            useExisting: FirebaseService
        }
    ],
})
export class PostsModule {}
