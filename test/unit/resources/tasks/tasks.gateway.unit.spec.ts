import { Test, TestingModule } from '@nestjs/testing';

import { Server } from 'socket.io';
import { TasksGateway } from '../../../../src/resources/tasks/gateway/tasks.gateway';
import { TasksService } from '../../../../src/resources/tasks/tasks.service';
import { CreateTaskDto } from '../../../../src/resources/tasks/dto/create-task.dto';
import { UpdateTaskDto } from '../../../../src/resources/tasks/dto/update-task.dto';
import { mockedTask } from '../../../shared/task';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditLogWsInterceptor } from '../../../../src/common/interceptors/audit-log-ws.interceptor';
import { AuditLogBufferService } from '../../../../src/resources/audit-log/audit-log-buffer.service';

describe('TasksGateway', () => {
    let gateway: TasksGateway;
    let tasksService: TasksService;
    let server: Server;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TasksGateway,
                JwtService,
                ConfigService,
                {
                    provide: TasksService,
                    useValue: {
                        create: jest.fn(),
                        update: jest.fn(),
                        multiReordering: jest.fn(),
                    },
                },
                // @UseInterceptors(AuditLogWsInterceptor) on TasksGateway makes Nest's
                // testing module construct a real enhancer instance even though these
                // tests call gateway methods directly and never go through the
                // interceptor chain - satisfy its one dependency with a stub.
                AuditLogWsInterceptor,
                {
                    provide: AuditLogBufferService,
                    useValue: { enqueue: jest.fn() },
                },
            ],
        }).compile();

        gateway = module.get<TasksGateway>(TasksGateway);
        tasksService = module.get<TasksService>(TasksService);
        server = {
            emit: jest.fn(),
        } as unknown as Server;
        gateway.server = server;
    });

    it('should create a task and broadcast it', async () => {
        const createTaskDto: CreateTaskDto = mockedTask;
        const createdTask = { id: 1, ...createTaskDto };

        jest.spyOn(tasksService, 'create').mockResolvedValue(createdTask as any);

        await gateway.createTask(createTaskDto);

        expect(tasksService.create).toHaveBeenCalledWith(createTaskDto);
        expect(server.emit).toHaveBeenCalledWith('update', createdTask);
    });

    it('should update a task and broadcast it', async () => {
        const updateTaskDto: UpdateTaskDto = { id: 1, title: 'Updated Task', description: 'Updated Description' };
        const updatedTask = { ...updateTaskDto };
        const mockedResolvedValue = { ...mockedTask, ...updateTaskDto };

        jest.spyOn(tasksService, 'update').mockResolvedValue(mockedResolvedValue as any);
        await gateway.updateTask(updatedTask);
        const result = await tasksService.update(updateTaskDto.id, updateTaskDto);
        expect(result).toEqual(mockedResolvedValue);
        expect(server.emit).toHaveBeenCalledWith('update', result);
    });

    it('should reorder multiple tasks and broadcast it', async () => {
        const tasks: CreateTaskDto[] = [
            mockedTask
        ];

        jest.spyOn(tasksService, 'multiReordering').mockResolvedValue(tasks as any);

        await gateway.multiReordering(tasks);

        expect(tasksService.multiReordering).toHaveBeenCalledWith(tasks);
        expect(server.emit).toHaveBeenCalledWith('multi-reordering', tasks);
    });
});
