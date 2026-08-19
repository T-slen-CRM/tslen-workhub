import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';
import { UploadAbstractService } from '../upload/upload.abstract.service';
import { ConfigService } from '@nestjs/config';
import { File } from '@google-cloud/storage/build/cjs/src/file';
import * as path from 'path';

/** copied from @google-cloud/storage/build/src/file because of the error */
export type SignerGetSignedUrlResponse = string;
export type GetSignedUrlResponse = [SignerGetSignedUrlResponse];
@Injectable()
export class FirebaseService implements UploadAbstractService{
    private storage: admin.storage.Storage;
    private serviceAccount: object;
    constructor (private configService: ConfigService) {}

    /**
     * Initialize Firebase Admin
     * @description Use this function instead of constructor to because of async import file
     * @returns {Promise<void>}
     */
    async init (): Promise<void> {
        if (!this.storage){
            /** if FIREBASE_SERVICE_ACCOUNT is a path to json credentials */
            if (this.configService.get('FIREBASE_SERVICE_ACCOUNT').endsWith('.json')) {
                this.serviceAccount = await import(path.join(process.cwd(), this.configService.get('FIREBASE_SERVICE_ACCOUNT')));
            } else {
                /** if FIREBASE_SERVICE_ACCOUNT is a json credentials - {} */
                this.serviceAccount = JSON.parse(this.configService.get('FIREBASE_SERVICE_ACCOUNT'));
            }
            admin.initializeApp({
                credential: admin.credential.cert(this.serviceAccount),
                storageBucket: this.configService.get('FIREBASE_STORAGE_BUCKET'),
            });
            this.storage = admin.storage();
        }
    }
    getDownloadURL (file: File): Promise<GetSignedUrlResponse> {
        return file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 1000 * 60 * 60 * 24 * 365 // 1 years
        });
    }
    async uploadImage (file: Express.Multer.File, destDir = ''): Promise<GetSignedUrlResponse> {
        const fileName = destDir ? `${destDir}${file.filename}` : file.filename;
        const fileOriginPath = file.path;

        const bucket = this.storage.bucket();
        const fileUploadPath = bucket.file(fileName);
        await bucket.upload(fileOriginPath, {
            destination: fileUploadPath,
            metadata: {
                contentType: file.mimetype
            }
        });
        return await this.getDownloadURL(fileUploadPath);
    }
}
