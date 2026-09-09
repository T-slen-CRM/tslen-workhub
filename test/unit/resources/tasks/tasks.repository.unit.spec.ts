import { TestBed } from '@automock/jest';
import { EntityManager } from 'typeorm';
import { TasksRepository } from '../../../../src/resources/tasks/tasks.repository';
import { mockedTask } from '../../../shared/task';
import { Tasks } from '../../../../src/resources/tasks/entities/task.entity';
import { TaskAttachments } from '../../../../src/resources/tasks/entities/task-attachments.entity';

describe('TaskRepository', () => {
    let repository: TasksRepository;
    let entityManager: EntityManager;
    beforeEach(async () => {
        const { unit, unitRef } = TestBed.create(TasksRepository).compile();
        repository = unit;
        entityManager = unitRef.get(EntityManager);
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

    describe('deleteAttachment', () => {
        it('deletes the TaskAttachments row by id', async () => {
            const deleteSpy = jest.spyOn(entityManager, 'delete').mockResolvedValue(undefined);

            await repository.deleteAttachment(2);

            expect(deleteSpy).toHaveBeenCalledWith(TaskAttachments, 2);
        });
    });

    describe('saveAttachments', () => {
        it('persists the given attachments and returns the saved rows (with real ids)', async () => {
            const toSave = [{ url: '/x', originName: 'a.png' }] as TaskAttachments[];
            const saved = [{ id: 9, url: '/x', originName: 'a.png' }] as TaskAttachments[];
            const saveSpy = jest.spyOn(entityManager, 'save').mockResolvedValue(saved as never);

            const result = await repository.saveAttachments(toSave);

            expect(saveSpy).toHaveBeenCalledWith(TaskAttachments, toSave);
            expect(result).toBe(saved);
        });
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
