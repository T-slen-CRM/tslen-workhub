import { TestBed } from '@automock/jest';
import { TasksService } from '../../../../src/resources/tasks/tasks.service';
import { TasksRepository } from '../../../../src/resources/tasks/tasks.repository';
import { TaskNotificationsService } from '../../../../src/resources/tasks/task-notifications.service';
import { TaskPhaseRepository } from '../../../../src/resources/task-phase/task-phase.repository';
import { UsersService } from '../../../../src/resources/users/users.service';
import { UsersRepository } from '../../../../src/resources/users/users.repository';
import { mockedTask } from '../../../shared/task';
import { Tasks } from '../../../../src/resources/tasks/entities/task.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { TaskPhase } from '../../../../src/resources/task-phase/entities/task-phase.entity';
import { UpdateTaskDto } from '../../../../src/resources/tasks/dto/update-task.dto';

describe('TasksService', () => {
    let service: TasksService;
    let repository: jest.Mocked<TasksRepository>;
    let taskNotificationsService: jest.Mocked<TaskNotificationsService>;
    let taskPhaseRepository: jest.Mocked<TaskPhaseRepository>;
    let usersService: jest.Mocked<UsersService>;
    let usersRepository: jest.Mocked<UsersRepository>;

    const actor = { id: 1, firstName: 'Ann', lastName: 'Actor' } as Users;
    const existingAssignee = { id: 2 } as Users;
    const newAssignee = { id: 3 } as Users;
    const author = { id: 4, firstName: 'Zoe', lastName: 'Author' } as Users;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(TasksService).compile();
        service = unit;
        repository = unitRef.get(TasksRepository);
        taskNotificationsService = unitRef.get(TaskNotificationsService);
        taskPhaseRepository = unitRef.get(TaskPhaseRepository);
        usersService = unitRef.get(UsersService);
        usersRepository = unitRef.get(UsersRepository);
        usersRepository.findOne.mockResolvedValue(actor);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should call multiReordering', async () => {
        const mockResponse = [mockedTask];
        jest.spyOn(service, 'multiReordering').mockResolvedValue(mockResponse as unknown as Tasks[]);
        const result = await service.multiReordering([]);
        expect(service.multiReordering).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });

    describe('update', () => {
        it('notifies only the newly added assignees, excluding the actor', async () => {
            const before = {
                id: 1, phaseId: 1, projectId: 1,
                taskUserAssignmentRelations: [{ userId: 2, user: existingAssignee }],
            } as unknown as Tasks;
            const after = {
                id: 1, phaseId: 1, projectId: 1, title: 'Ship it',
                taskUserAssignmentRelations: [
                    { userId: 2, user: existingAssignee },
                    { userId: 3, user: newAssignee },
                ],
            } as unknown as Tasks;
            repository.findOne.mockResolvedValue(before);
            repository.updateOneWithRelations.mockResolvedValue(after);

            await service.update(1, { actorUserId: 1, phaseId: 1 } as UpdateTaskDto);

            expect(taskNotificationsService.notifyAssigned).toHaveBeenCalledWith(after, [newAssignee], actor);
        });

        it('does not fire an assignment notification when the assignee list is unchanged', async () => {
            const before = {
                id: 1, phaseId: 1, projectId: 1,
                taskUserAssignmentRelations: [{ userId: 2, user: existingAssignee }],
            } as unknown as Tasks;
            const after = { ...before, title: 'Renamed' } as Tasks;
            repository.findOne.mockResolvedValue(before);
            repository.updateOneWithRelations.mockResolvedValue(after);

            await service.update(1, { actorUserId: 1 } as UpdateTaskDto);

            expect(taskNotificationsService.notifyAssigned).not.toHaveBeenCalled();
        });

        it('notifies assignees and author on a phase move (actor-exclusion happens downstream in TaskNotificationsService)', async () => {
            const before = {
                id: 1, phaseId: 1, projectId: 1, createdBy: '4',
                taskUserAssignmentRelations: [{ userId: 2, user: existingAssignee }],
            } as unknown as Tasks;
            const after = { ...before, phaseId: 2 } as Tasks;
            repository.findOne.mockResolvedValue(before);
            repository.updateOneWithRelations.mockResolvedValue(after);
            usersRepository.findOne.mockImplementation((id: number) => Promise.resolve(id === 1 ? actor : author));
            taskPhaseRepository.findOne
                .mockResolvedValueOnce({ id: 1, name: 'To Do' } as TaskPhase)
                .mockResolvedValueOnce({ id: 2, name: 'In Progress' } as TaskPhase);

            await service.update(1, { actorUserId: 1, phaseId: 2 } as UpdateTaskDto);

            expect(taskNotificationsService.notifyPhaseMoved).toHaveBeenCalledWith(
                after, 'To Do', 'In Progress', [existingAssignee, author], actor,
            );
        });

        it('does not fire a phase-move notification when phaseId is unchanged', async () => {
            const before = {
                id: 1, phaseId: 1, projectId: 1,
                taskUserAssignmentRelations: [],
            } as unknown as Tasks;
            const after = { ...before, title: 'Renamed' } as Tasks;
            repository.findOne.mockResolvedValue(before);
            repository.updateOneWithRelations.mockResolvedValue(after);

            await service.update(1, { actorUserId: 1, phaseId: 1 } as UpdateTaskDto);

            expect(taskNotificationsService.notifyPhaseMoved).not.toHaveBeenCalled();
        });

        it('never resolves the actor via the RBAC-scoped UsersService.findOneById (regression: it dereferences user.companyId and crashes when passed null)', async () => {
            const before = {
                id: 1, phaseId: 1, projectId: 1,
                taskUserAssignmentRelations: [{ userId: 2, user: existingAssignee }],
            } as unknown as Tasks;
            const after = {
                id: 1, phaseId: 1, projectId: 1,
                taskUserAssignmentRelations: [
                    { userId: 2, user: existingAssignee },
                    { userId: 3, user: newAssignee },
                ],
            } as unknown as Tasks;
            repository.findOne.mockResolvedValue(before);
            repository.updateOneWithRelations.mockResolvedValue(after);

            await service.update(1, { actorUserId: 1, phaseId: 1 } as UpdateTaskDto);

            expect(usersService.findOneById).not.toHaveBeenCalled();
            expect(usersRepository.findOne).toHaveBeenCalledWith(1);
        });
    });
});
