import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadAbstractService } from '../upload/upload.abstract.service';
import { FirebaseService } from '../firebase/firebase.service';
import { R2Service } from '../r2/r2.service';

/**
 * Central provider for the file-upload backend. Which implementation of
 * {@link UploadAbstractService} is used is selected at runtime by the
 * STORAGE_DRIVER env var:
 *   - `r2`       -> Cloudflare R2 (S3-compatible, public custom domain)
 *   - `firebase` -> Firebase Storage (default / legacy)
 *
 * Consumer modules import this module instead of binding a concrete service,
 * so switching providers is a one-line env change with no code edits.
 */
export async function createUploadService (configService: ConfigService): Promise<UploadAbstractService> {
    const driver = (configService.get<string>('STORAGE_DRIVER') || 'firebase').toLowerCase();

    if (driver === 'r2') {
        Logger.log('Using Cloudflare R2 storage driver', 'StorageModule');
        return new R2Service(configService);
    }

    const firebase = new FirebaseService(configService);
    try {
        await firebase.init();
    } catch (err) {
        Logger.warn(
            `Firebase not configured — uploads will fail until FIREBASE_SERVICE_ACCOUNT/FIREBASE_STORAGE_BUCKET are set correctly: ${err.message}`,
            'StorageModule',
        );
    }
    return firebase;
}

@Module({
    providers: [
        {
            provide: UploadAbstractService,
            useFactory: createUploadService,
            inject: [ConfigService],
        },
    ],
    exports: [UploadAbstractService],
})
export class StorageModule {}
