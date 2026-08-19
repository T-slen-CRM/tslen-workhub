import { TasksService } from '../../../../src/resources/tasks/tasks.service';
import { TestBed } from '@automock/jest';
import { mockedTask } from '../../../shared/task';
import { Tasks } from '../../../../src/resources/tasks/entities/task.entity';

describe('TasksService', () => {

    const { unit } = TestBed.create(TasksService).compile();
    const service = unit;

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should call multiReordering', async () => {
        const mockResponse = [mockedTask];
        jest.spyOn(service, 'multiReordering').mockResolvedValue(mockResponse as Tasks[]);
        const result = await service.multiReordering([]);
        expect(service.multiReordering).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
});
