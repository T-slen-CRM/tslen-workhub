import { INestApplication } from '@nestjs/common/interfaces/nest-application.interface';
import { Test } from '@nestjs/testing/test';
import request = require('supertest');
import { AuthGuard } from '../../src/resources/auth/guards/auth.guard';
import { ExecutionContext } from '@nestjs/common/interfaces/features/execution-context.interface';
import { TestingModule } from '@nestjs/testing/testing-module';
import { mockUser } from '../shared/users';
import { SlackService } from '../../src/common/services/slack/slack.service';
import { TaskProject } from '../../src/resources/task-project/entities/task-project.entity';
import { TaskProjectController } from '../../src/resources/task-project/task-project.controller';
import { TaskProjectService } from '../../src/resources/task-project/task-project.service';
import { TaskProjectRepository } from '../../src/resources/task-project/task-project.repository';
import { ErrorService } from '../../src/common/services/error/error.service';

describe('TaskProjectController (e2e)', () => {
    let app: INestApplication;
    const mockedProjects: Partial<TaskProject> = { id: 1, name: 'test1' };
    const mockedUserObject = mockUser;
    const mockedAuthGuard = { canActivate: (context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest();
        req.user = mockedUserObject;
        return true;
    } };
    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test
            .createTestingModule({
                controllers: [TaskProjectController],
                providers: [TaskProjectService,
                    {
                        provide: TaskProjectRepository,
                        useValue: {
                            findAll: jest.fn(() => [mockedProjects]),
                            findOne: jest.fn(() => mockedProjects),
                            getOneWithRelations: jest.fn(() => mockedProjects),
                            create: jest.fn(() => mockedProjects),
                            save: jest.fn(() => mockedProjects),
                            update: jest.fn(() => mockedProjects),
                            delete: jest.fn(() => mockedProjects),
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
                    ErrorService,
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

    it('/task-project (GET)', async () => {
        await request(app.getHttpServer())
            .get('/task-project')
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual([mockedProjects]);
            });
    });
    it('/task-project/:id (GET)', async () => {
        await request(app.getHttpServer())
            .get('/task-project/1')
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(mockedProjects);
            });
    });
    it('/task-project (POST)', async () => {
        await request(app.getHttpServer())
            .post('/task-project')
            .send({ name: 'test1' })
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(mockedProjects);
            });
    });
    it('/task-project/:id (PATCH)', async () => {
        await request(app.getHttpServer())
            .patch('/task-project/1')
            .send({ name: 'test1' })
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(mockedProjects);
            });
    });
    it('/task-project/:id (DELETE)', async () => {
        await request(app.getHttpServer())
            .delete('/task-project/1')
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(mockedProjects);
            });
    });
});
