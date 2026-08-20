import { TasksController } from '../../../../src/resources/tasks/tasks.controller';
import { TestBed } from '@automock/jest';
import { mockUser } from '../../../shared/users';
import { mockedTask } from '../../../shared/task';
import { TaskAttachments } from '../../../../src/resources/tasks/entities/task-attachments.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';

describe('TasksController', () => {
    let controller: TasksController;

    beforeEach(async () => {
        const { unit } = TestBed.create(TasksController).compile();
        controller = unit;
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
    it('should call findAll', async () => {
        const mockResponse = [mockedTask];
        jest.spyOn(controller, 'findAll').mockResolvedValue(mockResponse as any);
        const result = await controller.findAll(mockUser as unknown as Users);
        expect(controller.findAll).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('should call findOne', async () => {
        const mockResponse = mockedTask;
        jest.spyOn(controller, 'findOne').mockResolvedValue(mockResponse as any);
        const result = await controller.findOne(mockUser as unknown as Users, 1);
        expect(controller.findOne).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('should call uploadFile', async () => {
        const mockedAttachments = [{
            "extension": "image/jpeg",
            "name": "1_1727430410441_w6kkyh4mpng",
            "originName": "1_test.jpg",
            "type": "image/jpeg",
            "url": "url"
        }] as TaskAttachments[];
        const mockFile = { originalname: 'test', buffer: Buffer.from('test') } as unknown as Express.Multer.File[];
        jest.spyOn(controller, 'uploadFile').mockResolvedValue(mockedAttachments);
        const result = await controller.uploadFile(mockUser as unknown as Users, mockFile, 1);
        expect(controller.uploadFile).toHaveBeenCalled();
        expect(result).toEqual(mockedAttachments);

    });
});
