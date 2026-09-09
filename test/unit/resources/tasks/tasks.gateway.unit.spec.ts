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
import { AuthGuard } from '../../../../src/resources/auth/guards/auth.guard';

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

    // Nest's global AuthGuard (APP_GUARD in AuthModule) only reaches HTTP
    // controllers, never @SubscribeMessage handlers - confirmed live: every
    // WS-originated task change reached the audit log with userId always
    // null, because AuthGuard never ran to populate client.user in the
    // first place (AuditLogWsInterceptor reading client.user was never the
    // problem). AuthGuard must be applied to this gateway explicitly so it
    // runs per-message like the HTTP case and sets client.user before
    // AuditLogWsInterceptor records the change.
    it('applies AuthGuard directly, since the global guard registration does not reach this gateway', () => {
        const guards = Reflect.getMetadata('__guards__', TasksGateway) ?? [];

        expect(guards).toContain(AuthGuard);
    });
});
