import { PutObjectCommand } from '@aws-sdk/client-s3';
import { R2Service } from '../../../../../src/common/services/r2/r2.service';

// The service streams the file from disk; stub that so no real file is needed.
jest.mock('fs', () => ({ createReadStream: jest.fn(() => ({})) }));

/**
 * R2Service talks to an S3-compatible endpoint, so these tests stub the
 * underlying client's `send` and the disk read, and assert the service maps a
 * Multer file to the right object key and returns a stable public URL built
 * from R2_PUBLIC_BASE_URL (option A: public bucket on a custom domain).
 */
describe('R2Service', () => {
    const config = {
        get: (key: string): string => {
            const values: Record<string, string> = {
                R2_ACCOUNT_ID: 'acc123',
                R2_ACCESS_KEY_ID: 'ak',
                R2_SECRET_ACCESS_KEY: 'sk',
                R2_BUCKET: 'tslen-uploads',
                R2_PUBLIC_BASE_URL: 'https://files.example.com',
            };
            return values[key];
        },
    } as any;

    let service: R2Service;
    let sendMock: jest.Mock;

    const file = {
        filename: 'abc.png',
        path: '/tmp/uploads/abc.png',
        mimetype: 'image/png',
    } as Express.Multer.File;

    beforeEach(() => {
        service = new R2Service(config);
        sendMock = jest.fn().mockResolvedValue({});
        (service as any).client.send = sendMock;
    });

    it('uploads under the destDir prefix and returns the public URL', async () => {
        const result = await service.uploadImage(file, 'posts/');

        expect(result).toEqual(['https://files.example.com/posts/abc.png']);

        expect(sendMock).toHaveBeenCalledTimes(1);
        const command = sendMock.mock.calls[0][0];
        expect(command).toBeInstanceOf(PutObjectCommand);
        expect(command.input.Bucket).toBe('tslen-uploads');
        expect(command.input.Key).toBe('posts/abc.png');
        expect(command.input.ContentType).toBe('image/png');
    });

    it('works without a destDir (key is just the filename)', async () => {
        const result = await service.uploadImage(file);

        expect(result).toEqual(['https://files.example.com/abc.png']);
        expect(sendMock.mock.calls[0][0].input.Key).toBe('abc.png');
    });

    it('tolerates a trailing slash on R2_PUBLIC_BASE_URL (no double slash)', async () => {
        const trailingConfig = {
            get: (key: string): string =>
                key === 'R2_PUBLIC_BASE_URL' ? 'https://files.example.com/' : config.get(key),
        } as any;
        const svc = new R2Service(trailingConfig);
        (svc as any).client.send = jest.fn().mockResolvedValue({});

        const result = await svc.uploadImage(file, 'profile/');
        expect(result).toEqual(['https://files.example.com/profile/abc.png']);
    });
});
