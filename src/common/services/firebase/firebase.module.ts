import { Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { ConfigService } from '@nestjs/config';
@Module({
    providers: [
        {
            provide: FirebaseService,
            useFactory: async (configService: ConfigService) => {
                const firebaseService = new FirebaseService(configService);
                await firebaseService.init();
                return firebaseService;
            },
            inject: [ConfigService],
        }
    ],
    exports: [
        FirebaseService
    ],
})
export class FirebaseModule {}
