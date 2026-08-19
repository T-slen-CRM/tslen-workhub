import { TestBed } from '@automock/jest';
import { NotFoundException } from '@nestjs/common';
import { ExternalTasksService } from '../../../../src/resources/external-tasks/external-tasks.service';
import { TasksService } from '../../../../src/resources/tasks/tasks.service';
import { TasksRepository } from '../../../../src/resources/tasks/tasks.repository';
import { TaskPhaseRepository } from '../../../../src/resources/task-phase/task-phase.repository';
import { TaskProjectRepository } from '../../../../src/resources/task-project/task-project.repository';
import { Tasks } from '../../../../src/resources/tasks/entities/task.entity';
import { TaskPhase } from '../../../../src/resources/task-phase/entities/task-phase.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { TaskProject } from '../../../../src/resources/task-project/entities/task-project.entity';

describe('ExternalTasksService', () => {
    let service: ExternalTasksService;
    let tasksService: jest.Mocked<TasksService>;
    let tasksRepository: jest.Mocked<TasksRepository>;
    let taskPhaseRepository: jest.Mocked<TaskPhaseRepository>;
    let taskProjectRepository: jest.Mocked<TaskProjectRepository>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(ExternalTasksService).compile();
        service = unit;
        tasksService = unitRef.get(TasksService);
        tasksRepository = unitRef.get(TasksRepository);
        taskPhaseRepository = unitRef.get(TaskPhaseRepository);
        taskProjectRepository = unitRef.get(TaskProjectRepository);
    });

    describe('list', () => {
        it('delegates to TasksRepository.findAllFiltered', async () => {
            const tasks = [{ id: 1 }] as Tasks[];
            tasksRepository.findAllFiltered.mockResolvedValue(tasks);

            const result = await service.list({ projectId: 3 });

            expect(tasksRepository.findAllFiltered).toHaveBeenCalledWith({ projectId: 3 });
            expect(result).toBe(tasks);
        });
    });

    describe('listProjects', () => {
        it('delegates to TaskProjectRepository.findAllWithPhases', async () => {
            const projects = [{ id: 7, name: 'Marketing', phases: [{ id: 14, name: 'ToDo' }] }];
            taskProjectRepository.findAllWithPhases.mockResolvedValue(projects);

            const result = await service.listProjects();

            expect(taskProjectRepository.findAllWithPhases).toHaveBeenCalled();
            expect(result).toBe(projects);
        });
    });

    describe('create', () => {
        it('derives projectId from the phase (via ProjectPhasesRelation) and ignores any client-supplied projectId', async () => {
            const phase = { id: 5 } as TaskPhase;
            taskPhaseRepository.findOne.mockResolvedValue(phase);
            taskProjectRepository.findByPhaseId.mockResolvedValue({ id: 9 } as TaskProject);
            const user = { id: 7, firstName: 'Jane', lastName: 'Doe' } as Users;
            const created = { id: 1 } as Tasks;
            tasksService.create.mockResolvedValue(created);

            const result = await service.create({ title: 'New task', phaseId: 5 } as never, user);

            expect(tasksService.create).toHaveBeenCalledWith(expect.objectContaining({
                title: 'New task',
                phaseId: 5,
                projectId: 9,
                createdByName: 'Jane Doe',
                priority: '',
            }));
            expect(result).toBe(created);
        });

        it('passes through an explicit priority instead of defaulting it', async () => {
            const phase = { id: 5 } as TaskPhase;
            taskPhaseRepository.findOne.mockResolvedValue(phase);
            taskProjectRepository.findByPhaseId.mockResolvedValue({ id: 9 } as TaskProject);
            const user = { id: 7, firstName: 'Jane', lastName: 'Doe' } as Users;
            tasksService.create.mockResolvedValue({ id: 1 } as Tasks);

            await service.create({ title: 'New task', phaseId: 5, priority: 'high' } as never, user);

            expect(tasksService.create).toHaveBeenCalledWith(expect.objectContaining({ priority: 'high' }));
        });

        it('throws NotFoundException for an unknown phaseId', async () => {
            taskPhaseRepository.findOne.mockResolvedValue(null);
            const user = { id: 7 } as Users;

            await expect(service.create({ title: 'New task', phaseId: 999 } as never, user))
                .rejects.toThrow(NotFoundException);
            expect(taskProjectRepository.findByPhaseId).not.toHaveBeenCalled();
            expect(tasksService.create).not.toHaveBeenCalled();
        });

        it('throws NotFoundException for a phase with no associated project, instead of crashing', async () => {
            const phase = { id: 31 } as TaskPhase;
            taskPhaseRepository.findOne.mockResolvedValue(phase);
            taskProjectRepository.findByPhaseId.mockResolvedValue(null);
            const user = { id: 7 } as Users;

            await expect(service.create({ title: 'New task', phaseId: 31 } as never, user))
                .rejects.toThrow(NotFoundException);
            expect(tasksService.create).not.toHaveBeenCalled();
        });
    });
});
