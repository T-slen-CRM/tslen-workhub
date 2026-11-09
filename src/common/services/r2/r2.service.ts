import * as fs from 'fs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { UploadAbstractService } from '../upload/upload.abstract.service';

/**
 * Cloudflare R2 implementation of {@link UploadAbstractService}.
 *
 * R2 exposes an S3-compatible API, so we use the AWS S3 client pointed at the
 * account's R2 endpoint. The bucket is served publicly over a custom domain
 * (R2_PUBLIC_BASE_URL), so uploads return a stable, CDN-served URL built from
 * the object key — no signing and no expiry (unlike the Firebase driver's
 * 1-year signed URLs).
 *
 * The returned value is a single-element string array to match the existing
 * contract callers rely on (`imageUrl[0]`).
 */
@Injectable()
export class R2Service implements UploadAbstractService {
    private readonly client: S3Client;
    private readonly bucket: string;
    private readonly publicBaseUrl: string;

    constructor (private readonly configService: ConfigService) {
        const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
        this.bucket = this.configService.get<string>('R2_BUCKET');
        this.publicBaseUrl = (this.configService.get<string>('R2_PUBLIC_BASE_URL') || '').replace(/\/+$/, '');

        this.client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID'),
                secretAccessKey: this.configService.get<string>('R2_SECRET_ACCESS_KEY'),
            },
        });
    }

    async uploadImage (file: Express.Multer.File, destDir = ''): Promise<string[]> {
        const key = destDir ? `${destDir}${file.filename}` : file.filename;

        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: fs.createReadStream(file.path),
            ContentType: file.mimetype,
        }));

        return [`${this.publicBaseUrl}/${key}`];
    }
}
