import { TestBed } from '@automock/jest';
import { TaskCommentsService } from '../../../../src/resources/task-comments/task-comments.service';
import { TaskCommentsRepository } from '../../../../src/resources/task-comments/task-comments.repository';
import { TaskComment } from '../../../../src/resources/tasks/entities/task-comment.entity';

// Simulates TypeORM's real behavior: save() only returns what was passed in
// plus generated columns (no eager relations), while findOne() does load
// eager relations. This is what let a comment with no `user` reach the
// frontend and crash `{{ comment.user.firstName }}`.
class FakeEntityManager {
    private readonly savedById = new Map<number, TaskComment>();
    private nextId = 1;

    async transaction<T> (work: (manager: FakeEntityManager) => Promise<T>): Promise<T> {
        return work(this);
    }

    async save (_entity: unknown, data: Partial<TaskComment>): Promise<TaskComment> {
        const id = this.nextId++;
        const saved = { ...data, id } as TaskComment;
        this.savedById.set(id, { ...saved, user: { id: data.userId, firstName: 'Jane', lastName: 'Doe' } } as TaskComment);
        return saved;
    }

    async findOne (_entity: unknown, options: { where: { id: number } }): Promise<TaskComment> {
        return this.savedById.get(options.where.id);
    }
}

describe('TaskCommentsRepository.createOneWithRelations', () => {
    it('re-fetches after save so the returned comment includes the eager user relation', async () => {
        const fakeManager = new FakeEntityManager();
        const { TaskCommentsRepository: RealTaskCommentsRepository } = jest.requireActual('../../../../src/resources/task-comments/task-comments.repository');
        const repository = new RealTaskCommentsRepository({} as never, fakeManager as never);

        const result = await repository.createOneWithRelations({ taskId: 5, content: 'hi', userId: 9 });

        expect(result.user).toEqual({ id: 9, firstName: 'Jane', lastName: 'Doe' });
    });
});

describe('TaskCommentsService', () => {
    let service: TaskCommentsService;
    let repository: jest.Mocked<TaskCommentsRepository>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(TaskCommentsService).compile();
        service = unit;
        repository = unitRef.get(TaskCommentsRepository);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findByTask', () => {
        it('delegates to the repository, keyed by taskId', async () => {
            const comments = [{ id: 1, taskId: 5, content: 'hi' }] as TaskComment[];
            repository.findByTaskId.mockResolvedValue(comments);

            const result = await service.findByTask(5);

            expect(repository.findByTaskId).toHaveBeenCalledWith(5);
            expect(result).toBe(comments);
        });
    });
});
