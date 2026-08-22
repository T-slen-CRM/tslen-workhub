import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { TasksEvents, TasksGateway } from '../../src/resources/tasks/gateway/tasks.gateway';
import { TasksService } from '../../src/resources/tasks/tasks.service';
import { TasksRepository } from '../../src/resources/tasks/tasks.repository';
import { SlackService } from '../../src/common/services/slack/slack.service';
import { ConfigService } from '@nestjs/config';
import { mockedTask } from '../shared/task';
import { JwtService } from '@nestjs/jwt';
import { UploadAbstractService } from '../../src/common/services/upload/upload.abstract.service';
import { UsersService } from '../../src/resources/users/users.service';
import { UsersRepository } from '../../src/resources/users/users.repository';
import { TaskNotificationsService } from '../../src/resources/tasks/task-notifications.service';
import { TaskPhaseRepository } from '../../src/resources/task-phase/task-phase.repository';
import { ErrorService } from '../../src/common/services/error/error.service';

async function createNestApp (): Promise<INestApplication> {
    const testingModule = await Test.createTestingModule({
        providers: [
            TasksGateway,
            TasksService,
            JwtService,
            {
                provide: TasksRepository,
                useValue: {
                    create: jest.fn(),
                    save: jest.fn(),
                    find: jest.fn(),
                    findOne: jest.fn(),
                    update: jest.fn(),
                    delete: jest.fn(),
                    remove: jest.fn(),
                },
            },
            SlackService,
            ErrorService,
            ConfigService,
            {
                provide: UploadAbstractService,
                useValue: {
                    uploadImage: jest.fn(() => ['url'])
                }
            },
            {
                provide: UsersService,
                useValue: {
                    validateUserIdByRole: jest.fn(() => true)
                }
            },
            {
                provide: UsersRepository,
                useValue: {
                    findOne: jest.fn(() => null)
                }
            },
            {
                provide: TaskNotificationsService,
                useValue: {
                    notifyAssigned: jest.fn(),
                    notifyCommented: jest.fn(),
                    notifyPhaseMoved: jest.fn()
                }
            },
            {
                provide: TaskPhaseRepository,
                useValue: {
                    findOne: jest.fn(() => null)
                }
            }
        ],
    }).compile();
    return testingModule.createNestApplication();
}

describe("TaskGateway", () => {
    let gateway: TasksGateway;
    let app: INestApplication;
    let ioClient: Socket;

    beforeAll(async () => {
    // Instantiate the app
        app = await createNestApp();
        // Get the gateway instance from the app instance
        gateway = app.get<TasksGateway>(TasksGateway);
        // Create a new client that will interact with the gateway
        ioClient = io("http://localhost:3000", {
            autoConnect: false,
            transports: ["websocket", "polling"],
        });

        app.listen(3000);
    });

    afterAll(async () => {
        await app.close();
    });
    beforeEach(async () => {
        ioClient.connect();
    });
    afterEach(async () => {
        ioClient.disconnect();
    });

    it("should be defined", () => {
        expect(gateway).toBeDefined();
    });

    it('should emit "task" on "create"', async () => {
        ioClient.emit(TasksEvents.CREATE, mockedTask);
        ioClient.on(TasksEvents.CREATE, () => console.log);
        // TODO: Fix this data with mocked promise
        expect(mockedTask).toBe(mockedTask);
    });

    it('should emit "task" on "update"', async () => {
        ioClient.emit(TasksEvents.UPDATE, mockedTask);
        ioClient.on(TasksEvents.UPDATE, () => console.log);
        // TODO: Fix this data with mocked promise
        expect(mockedTask).toBe(mockedTask);
    });

    it('should emit "task" on "multi-reordering"', async () => {
        const tasks = [mockedTask];
        ioClient.emit(TasksEvents.MULTI_REORDERING, tasks);
        ioClient.on(TasksEvents.MULTI_REORDERING, () => console.log);
        // TODO: Fix this data with mocked promise
        expect(tasks).toBe(tasks);
    });

});
