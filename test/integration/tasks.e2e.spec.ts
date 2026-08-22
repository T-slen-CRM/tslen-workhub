import { INestApplication } from '@nestjs/common/interfaces/nest-application.interface';
import { Test } from '@nestjs/testing/test';
import * as request from 'supertest';
import { AuthGuard } from '../../src/resources/auth/guards/auth.guard';
import { ExecutionContext } from '@nestjs/common/interfaces/features/execution-context.interface';
import { TestingModule } from '@nestjs/testing/testing-module';
import { mockUser } from '../shared/users';
import { SlackService } from '../../src/common/services/slack/slack.service';
import { Tasks } from '../../src/resources/tasks/entities/task.entity';
import { TasksController } from '../../src/resources/tasks/tasks.controller';
import { TasksService } from '../../src/resources/tasks/tasks.service';
import { TasksRepository } from '../../src/resources/tasks/tasks.repository';
import { UploadAbstractService } from '../../src/common/services/upload/upload.abstract.service';
import { UsersService } from '../../src/resources/users/users.service';
import { UsersRepository } from '../../src/resources/users/users.repository';
import { TaskNotificationsService } from '../../src/resources/tasks/task-notifications.service';
import { TaskPhaseRepository } from '../../src/resources/task-phase/task-phase.repository';
import { ErrorService } from '../../src/common/services/error/error.service';

describe('TasksController (e2e)', () => {
    let app: INestApplication;
    const mockedTask: Partial<Tasks> = { id: 1, title: 'test1' };
    const mockedUserObject = mockUser;
    const mockedAuthGuard = { canActivate: (context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest();
        req.user = mockedUserObject;
        return true;
    } };
    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test
            .createTestingModule({
                controllers: [TasksController],
                providers: [TasksService,
                    {
                        provide: TasksRepository,
                        useValue: {
                            findAll: jest.fn(() => [mockedTask]),
                            findOne: jest.fn(() => mockedTask)
                        },
                    },
                    {
                        provide: SlackService,
                        useValue: {
                            send: jest.fn(),
                            sendError: jest.fn(),
                            sendWarning: jest.fn(),
                            sendInfo: jest.fn(),
                        }
                    },
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
                    },
                    ErrorService
                ],
            })
            .overrideGuard(AuthGuard).useValue(mockedAuthGuard)
            .compile();
        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close(); // Properly close the NestJS application
    });

    it('should be defined', () => {
        expect(app).toBeDefined();
    });

    it('/tasks (GET)', async () => {
        await request(app.getHttpServer())
            .get('/tasks')
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual([mockedTask]);
            });
    });
    it('/tasks/:id (GET)', async () => {
        await request(app.getHttpServer())
            .get('/tasks/1')
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(mockedTask);
            });
    });
    it('should upload attachments POST /upload-attachments', () => {
        return request(app.getHttpServer())
            .post('/tasks/upload-attachments?userId=1')
            .attach('attachments', 'test/shared/1_test.jpg')
            .field('name', 'test')
            .expect(201)
    });
});
