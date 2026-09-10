import { TestBed } from '@automock/jest';
import { NotFoundException } from '@nestjs/common';
import { MeetingBackgroundImagesService } from '../../../../src/resources/meeting-background-images/meeting-background-images.service';
import { MeetingBackgroundImagesRepository } from '../../../../src/resources/meeting-background-images/meeting-background-images.repository';
import { MeetingBackgroundImage } from '../../../../src/resources/meeting-background-images/entities/meeting-background-image.entity';
import { UploadAbstractService } from '../../../../src/common/services/upload/upload.abstract.service';
import { Users } from '../../../../src/resources/users/entities/users.entity';

describe('MeetingBackgroundImagesService', () => {
    let service: MeetingBackgroundImagesService;
    let repository: jest.Mocked<MeetingBackgroundImagesRepository>;
    let uploadService: jest.Mocked<UploadAbstractService>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(MeetingBackgroundImagesService).compile();
        service = unit;
        repository = unitRef.get(MeetingBackgroundImagesRepository);
        uploadService = unitRef.get(UploadAbstractService as never);
    });

    describe('upload', () => {
        it('uploads the file and persists it scoped to the calling user', async () => {
            const user = { id: 7 } as Users;
            const file = { originalname: 'office.png', mimetype: 'image/png' } as Express.Multer.File;
            uploadService.uploadImage.mockResolvedValue(['https://storage.example/signed-url']);
            repository.create.mockImplementation(async (data: Partial<MeetingBackgroundImage>) => ({ ...data, id: 1 } as MeetingBackgroundImage));

            const result = await service.upload(user, file);

            expect(uploadService.uploadImage).toHaveBeenCalledWith(file, 'meetingBackgrounds/');
            const [savedData] = repository.create.mock.calls[0];
            expect(savedData.userId).toBe(7);
            expect(savedData.url).toBe('https://storage.example/signed-url');
            expect(savedData.originName).toBe('office.png');
            expect(savedData.type).toBe('image/png');
            expect(result.id).toBe(1);
        });
    });

    describe('findAllForUser', () => {
        it('delegates to the repository, keyed by userId', async () => {
            const rows = [{ id: 1, userId: 7, url: 'x', originName: 'a.png', type: 'image/png', createdAt: new Date() }] as MeetingBackgroundImage[];
            repository.findAllForUser.mockResolvedValue(rows);

            const result = await service.findAllForUser(7);

            expect(repository.findAllForUser).toHaveBeenCalledWith(7);
            expect(result).toBe(rows);
        });
    });

    describe('remove', () => {
        it('deletes the row when it belongs to the caller', async () => {
            repository.findOne.mockResolvedValue({ id: 1, userId: 7 } as MeetingBackgroundImage);

            await service.remove(1, 7);

            expect(repository.delete).toHaveBeenCalledWith(1);
        });

        it('throws NotFoundException, and does not delete, when the image is owned by a different user', async () => {
            repository.findOne.mockResolvedValue({ id: 1, userId: 999 } as MeetingBackgroundImage);

            await expect(service.remove(1, 7)).rejects.toThrow(NotFoundException);
            expect(repository.delete).not.toHaveBeenCalled();
        });

        it('throws NotFoundException when the image does not exist', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(service.remove(1, 7)).rejects.toThrow(NotFoundException);
            expect(repository.delete).not.toHaveBeenCalled();
        });
    });
});
