import { TestBed } from '@automock/jest';
import { TasksRepository } from '../../../../src/resources/tasks/tasks.repository';
import { mockedTask } from '../../../shared/task';
import { Tasks } from '../../../../src/resources/tasks/entities/task.entity';

describe('TaskRepository', () => {
    let repository: TasksRepository;
    beforeEach(async () => {
        const { unit } = TestBed.create(TasksRepository).compile();
        repository = unit;
    });
    it('should be defined', () => {
        expect(repository).toBeDefined();
    });
    it('should call multiReordering', async () => {
        const mockResponse = [mockedTask];
        jest.spyOn(repository, 'multiReordering').mockResolvedValue(mockResponse as unknown as Tasks[]);
        const result = await repository.multiReordering([]);
        expect(repository.multiReordering).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });

    describe('findAllFiltered', () => {
        it('applies projectId, phaseId, and status as an AND-combined where clause', async () => {
            const tasks = [mockedTask] as unknown as Tasks[];
            const findSpy = jest.spyOn(repository['tasksRepository'], 'find').mockResolvedValue(tasks);

            const result = await repository.findAllFiltered({ projectId: 3, phaseId: 5, status: 'inProgress' });

            expect(findSpy).toHaveBeenCalledWith({ where: { projectId: 3, phaseId: 5, status: 'inProgress' } });
            expect(result).toBe(tasks);
        });

        it('omits filters that were not provided', async () => {
            const tasks = [mockedTask] as unknown as Tasks[];
            const findSpy = jest.spyOn(repository['tasksRepository'], 'find').mockResolvedValue(tasks);

            await repository.findAllFiltered({ projectId: 3 });

            expect(findSpy).toHaveBeenCalledWith({ where: { projectId: 3 } });
        });

        it('returns everything when no filters are provided, matching todays unfiltered GET /tasks behavior', async () => {
            const tasks = [mockedTask] as unknown as Tasks[];
            const findSpy = jest.spyOn(repository['tasksRepository'], 'find').mockResolvedValue(tasks);

            await repository.findAllFiltered({});

            expect(findSpy).toHaveBeenCalledWith({ where: {} });
        });
    });
});
