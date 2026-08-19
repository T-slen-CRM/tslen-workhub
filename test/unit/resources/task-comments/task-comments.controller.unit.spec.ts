import { TestBed } from '@automock/jest';
import { TaskCommentsController } from '../../../../src/resources/task-comments/task-comments.controller';
import { TaskCommentsService } from '../../../../src/resources/task-comments/task-comments.service';
import { TaskComment } from '../../../../src/resources/tasks/entities/task-comment.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { mockUser } from '../../../shared/users';

describe('TaskCommentsController', () => {
    let controller: TaskCommentsController;
    let service: jest.Mocked<TaskCommentsService>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(TaskCommentsController).compile();
        controller = unit;
        service = unitRef.get(TaskCommentsService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('findAll', () => {
        it('lists comments for the given taskId via the service', async () => {
            const comments = [{ id: 1, taskId: 5, content: 'hi' }] as TaskComment[];
            service.findByTask.mockResolvedValue(comments);

            const result = await controller.findAll(5);

            expect(service.findByTask).toHaveBeenCalledWith(5);
            expect(result).toBe(comments);
        });
    });

    describe('create', () => {
        it('sets userId from the authenticated user, not the client body', async () => {
            const created = { id: 1, taskId: 5, userId: 1, content: 'hi' } as TaskComment;
            service.create.mockResolvedValue(created);

            const result = await controller.create({ taskId: 5, content: 'hi' }, mockUser as Users);

            expect(service.create).toHaveBeenCalledWith({ taskId: 5, content: 'hi', userId: mockUser.id });
            expect(result).toBe(created);
        });
    });
});
