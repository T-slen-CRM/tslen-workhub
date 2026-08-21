import { Logger, Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { ConfigService } from '@nestjs/config';

export async function createFirebaseService (configService: ConfigService): Promise<FirebaseService> {
    const firebaseService = new FirebaseService(configService);
    try {
        await firebaseService.init();
    } catch (err) {
        Logger.warn(
            `Firebase not configured — uploads will fail until FIREBASE_SERVICE_ACCOUNT/FIREBASE_STORAGE_BUCKET are set correctly: ${err.message}`,
            'FirebaseModule'
        );
    }
    return firebaseService;
}

@Module({
    providers: [
        {
            provide: FirebaseService,
            useFactory: createFirebaseService,
            inject: [ConfigService],
        }
    ],
    exports: [
        FirebaseService
    ],
})
export class FirebaseModule {}
