import { INestApplication } from '@nestjs/common/interfaces/nest-application.interface';
import { Test } from '@nestjs/testing/test';
import * as request from 'supertest';
import { AuthGuard } from '../../src/resources/auth/guards/auth.guard';
import { ExecutionContext } from '@nestjs/common/interfaces/features/execution-context.interface';
import { TestingModule } from '@nestjs/testing/testing-module';
import { mockUser } from '../shared/users';
import { SlackService } from '../../src/common/services/slack/slack.service';
import { TaskPhaseController } from '../../src/resources/task-phase/task-phase.controller';
import { TaskPhaseService } from '../../src/resources/task-phase/task-phase.service';
import { TaskPhaseRepository } from '../../src/resources/task-phase/task-phase.repository';
import { CreateTaskPhaseDto } from 'src/resources/task-phase/dto/create-task-phase.dto';

describe('TaskPhaseController (e2e)', () => {
    let app: INestApplication;
    const mockedPhase: Partial<CreateTaskPhaseDto> = { id: 1, name: 'test1' };
    const mockedUserObject = mockUser;
    const mockedAuthGuard = { canActivate: (context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest();
        req.user = mockedUserObject;
        return true;
    } };
    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test
            .createTestingModule({
                controllers: [TaskPhaseController],
                providers: [TaskPhaseService,
                    {
                        provide: TaskPhaseRepository,
                        useValue: {
                            findAll: jest.fn(() => [mockedPhase]),
                            findOne: jest.fn(() => mockedPhase),
                            getOneWithRelations: jest.fn(() => mockedPhase),
                            create: jest.fn(() => mockedPhase),
                            save: jest.fn(() => mockedPhase),
                            update: jest.fn(() => mockedPhase),
                            delete: jest.fn(() => mockedPhase),
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
                    }
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

    it('/task-phase (GET)', async () => {
        await request(app.getHttpServer())
            .get('/task-phase')
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual([mockedPhase]);
            });
    });
    it('/task-phase (POST)', async () => {
        await request(app.getHttpServer())
            .post('/task-phase')
            .send({ name: 'test1' })
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(mockedPhase);
            });
    });
    it('should update /task-phase/:id (PATCH)', () => {
        return request(app.getHttpServer())
            .patch('/task-phase/1')
            .send({ name: 'test1' })
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(mockedPhase);
            });
    });
    it('should delete /task-phase/:id (DELETE)', () => {
        return request(app.getHttpServer())
            .delete('/task-phase/1')
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(mockedPhase);
            });
    });
});
