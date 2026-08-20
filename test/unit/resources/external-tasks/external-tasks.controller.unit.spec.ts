import { TestBed } from '@automock/jest';
import { ExternalTasksController } from '../../../../src/resources/external-tasks/external-tasks.controller';
import { ExternalTasksService } from '../../../../src/resources/external-tasks/external-tasks.service';
import { Tasks } from '../../../../src/resources/tasks/entities/task.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { mockUser } from '../../../shared/users';

describe('ExternalTasksController', () => {
    let controller: ExternalTasksController;
    let service: jest.Mocked<ExternalTasksService>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(ExternalTasksController).compile();
        controller = unit;
        service = unitRef.get(ExternalTasksService);
    });

    describe('findAll', () => {
        it('passes query filters through to the service', async () => {
            const tasks = [{ id: 1 }] as Tasks[];
            service.list.mockResolvedValue(tasks);

            const result = await controller.findAll({ projectId: 3, phaseId: 5, status: 'inProgress' });

            expect(service.list).toHaveBeenCalledWith({ projectId: 3, phaseId: 5, status: 'inProgress' });
            expect(result).toBe(tasks);
        });
    });

    describe('create', () => {
        it('creates a task as the authenticated (token-owning) user', async () => {
            const created = { id: 1 } as Tasks;
            service.create.mockResolvedValue(created);
            const dto = { title: 'New task', phaseId: 5 };

            const result = await controller.create(dto as never, mockUser as unknown as Users);

            expect(service.create).toHaveBeenCalledWith(dto, mockUser);
            expect(result).toBe(created);
        });
    });
});
