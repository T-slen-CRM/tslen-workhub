import { TestBed } from '@automock/jest';
import { TaskCommentsController } from '../../../../src/resources/task-comments/task-comments.controller';
import { TaskCommentsService } from '../../../../src/resources/task-comments/task-comments.service';
import { TasksService } from '../../../../src/resources/tasks/tasks.service';
import { TaskNotificationsService } from '../../../../src/resources/tasks/task-notifications.service';
import { TasksGateway, TasksEvents } from '../../../../src/resources/tasks/gateway/tasks.gateway';
import { TaskComment } from '../../../../src/resources/tasks/entities/task-comment.entity';
import { Tasks } from '../../../../src/resources/tasks/entities/task.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { mockUser } from '../../../shared/users';

describe('TaskCommentsController', () => {
    let controller: TaskCommentsController;
    let service: jest.Mocked<TaskCommentsService>;
    let tasksService: jest.Mocked<TasksService>;
    let taskNotificationsService: jest.Mocked<TaskNotificationsService>;
    let tasksGateway: jest.Mocked<TasksGateway>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(TaskCommentsController).compile();
        controller = unit;
        service = unitRef.get(TaskCommentsService);
        tasksService = unitRef.get(TasksService);
        taskNotificationsService = unitRef.get(TaskNotificationsService);
        tasksGateway = unitRef.get(TasksGateway);
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
            tasksService.findOneById.mockResolvedValue(null);

            const result = await controller.create({ taskId: 5, content: 'hi' }, mockUser as unknown as Users);

            expect(service.create).toHaveBeenCalledWith({ taskId: 5, content: 'hi', userId: mockUser.id });
            expect(result).toBe(created);
        });

        it('notifies the task recipients, excluding the commenter', async () => {
            const created = { id: 1, taskId: 5, userId: 1, content: 'nice' } as TaskComment;
            const task = { id: 5, title: 'Ship it' } as Tasks;
            const recipients = [{ id: 2 } as Users];
            service.create.mockResolvedValue(created);
            tasksService.findOneById.mockResolvedValue(task);
            tasksService.collectTaskRecipients.mockResolvedValue(recipients);

            await controller.create({ taskId: 5, content: 'nice' }, mockUser as unknown as Users);

            expect(tasksService.collectTaskRecipients).toHaveBeenCalledWith(task);
            expect(taskNotificationsService.notifyCommented).toHaveBeenCalledWith(task, 'nice', mockUser, recipients);
        });

        it('does not notify when the task cannot be found', async () => {
            const created = { id: 1, taskId: 5, userId: 1, content: 'hi' } as TaskComment;
            service.create.mockResolvedValue(created);
            tasksService.findOneById.mockResolvedValue(null);

            await controller.create({ taskId: 5, content: 'hi' }, mockUser as unknown as Users);

            expect(taskNotificationsService.notifyCommented).not.toHaveBeenCalled();
        });

        it('broadcasts the new comment to every connected tasks-socket client, so an open task card updates live', async () => {
            const created = { id: 1, taskId: 5, userId: 1, content: 'hi' } as TaskComment;
            service.create.mockResolvedValue(created);
            tasksService.findOneById.mockResolvedValue(null);

            await controller.create({ taskId: 5, content: 'hi' }, mockUser as unknown as Users);

            expect(tasksGateway.broadcast).toHaveBeenCalledWith(TasksEvents.COMMENT_CREATED, created);
        });
    });
});
