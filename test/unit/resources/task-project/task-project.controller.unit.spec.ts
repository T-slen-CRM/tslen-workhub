import { TaskProjectController } from '../../../../src/resources/task-project/task-project.controller';
import { TestBed } from '@automock/jest';
import { TaskProject } from '../../../../src/resources/task-project/entities/task-project.entity';
import { mockUser } from '../../../shared/users';
import { DeleteResult } from 'typeorm';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { CreateTaskProjectDto } from '../../../../src/resources/task-project/dto/create-task-project.dto';
import { UpdateTaskProjectDto } from '../../../../src/resources/task-project/dto/update-task-project.dto';

describe('TaskProjectController', () => {
    let controller: TaskProjectController;
    const mockProject = { id: 1, name: 'test' } as TaskProject;
    beforeEach(async () => {
        const { unit } = TestBed.create(TaskProjectController).compile();
        controller = unit;
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
    it('should call taskProjectService.create', async () => {
        jest.spyOn(controller, 'create').mockResolvedValue(mockProject);
        const result = await controller.create(mockProject as unknown as CreateTaskProjectDto);
        expect(controller.create).toHaveBeenCalled();
        expect(result).toEqual(mockProject);
    });
    it('should call taskProjectService.findAll', async () => {
        const mockResponse = [mockProject];
        jest.spyOn(controller, 'findAll').mockResolvedValue(mockResponse);
        const result = await controller.findAll(mockUser as unknown as Users);
        expect(controller.findAll).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('should call taskProjectService.update', async () => {
        jest.spyOn(controller, 'update').mockResolvedValue(mockProject);
        const result = await controller.update(1, mockProject as unknown as UpdateTaskProjectDto);
        expect(controller.update).toHaveBeenCalled();
        expect(result).toEqual(mockProject);
    });
    it('should call taskProjectService.delete', async () => {
        jest.spyOn(controller, 'remove').mockResolvedValue({ affected: 1 } as DeleteResult);
        const result = await controller.remove(1);
        expect(controller.remove).toHaveBeenCalled();
        expect(result).toEqual({ affected: 1 });
    });
    it('should call taskProjectService.findOneById', async () => {
        jest.spyOn(controller, 'findOne').mockResolvedValue(mockProject);
        const result = await controller.findOne(mockUser as unknown as Users, 1);
        expect(controller.findOne).toHaveBeenCalled();
        expect(result).toEqual(mockProject);
    });
});
