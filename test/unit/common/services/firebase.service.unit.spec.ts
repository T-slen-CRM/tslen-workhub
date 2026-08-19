import { FirebaseService, GetSignedUrlResponse } from '../../../../src/common/services/firebase/firebase.service';
import { TestBed } from '@automock/jest';

describe('FirebaseService', () => {
    let service: FirebaseService;
    beforeAll(async () => {
        const { unit } = TestBed.create(FirebaseService).compile();
        service = unit;
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should call firebase.init', async () => {
    // mockResolvedValue for  void function
        jest.spyOn(service, 'init').mockResolvedValue();
        await service.init();
        expect(service.init).toHaveBeenCalled();
    });
    it('should call firebase.uploadImage', async () => {
        const file: Express.Multer.File = {
            fieldname: 'file',
            originalname: 'test.jpg',
            encoding: '7bit',
            mimetype: 'image/jpeg',
            destination: 'uploads/',
            filename: 'test.jpg',
            size: 22,
            stream: null,
            path: '',
            buffer: Buffer.from(''),
        }
        const signedUrlResponse = '' as unknown as Promise<GetSignedUrlResponse>;
        jest.spyOn(service, 'uploadImage').mockResolvedValue(signedUrlResponse);
        jest.spyOn(service, 'getDownloadURL').mockResolvedValue(signedUrlResponse);
        const result = await service.uploadImage(file);
        expect(result).toEqual(signedUrlResponse);
    });
});
