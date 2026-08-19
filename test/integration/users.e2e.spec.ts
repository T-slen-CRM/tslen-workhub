import { INestApplication } from '@nestjs/common/interfaces/nest-application.interface';
import { Test } from '@nestjs/testing/test';
import { UsersService } from '../../src/resources/users/users.service';
import * as request from 'supertest';
import { Users } from '../../src/resources/users/entities/users.entity';
import { AuthGuard } from '../../src/resources/auth/guards/auth.guard';
import { ExecutionContext } from '@nestjs/common/interfaces/features/execution-context.interface';
import { TestingModule } from '@nestjs/testing/testing-module';
import { UsersRepository } from '../../src/resources/users/users.repository';
import { mockUser } from '../shared/users';
import { SlackService } from '../../src/common/services/slack/slack.service';
import { AuthService } from '../../src/resources/auth/auth.service';
import { accessToken } from '../shared/auth';
import { UsersController } from '../../src/resources/users/users.controller';
import { AuthController } from '../../src/resources/auth/auth.controller';

describe('UsersController (e2e)', () => {
    let app: INestApplication;
    let ACCESS_TOKEN: string;
    const mockedUsers: Partial<Users>[] = [
        { id: 1, firstName: 'John', lastName: 'Doe' },
        { id: 2, firstName: 'Jane', lastName: 'Doe' },
    ]
    const mockedUserObject = mockUser;
    const mockedAuthGuard = { canActivate: (context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest();
        req.user = mockedUserObject;
        return true;
    } };
    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test
            .createTestingModule({
                // imports: [AppModule]
                controllers: [
                    UsersController,
                    AuthController
                ],
                providers: [
                    UsersService,
                    AuthService,
                    {
                        provide: UsersRepository,
                        useValue: {
                            create: jest.fn(() => mockedUsers[0]),
                            findAll: jest.fn(() => mockedUsers),
                            findOne: jest.fn(() => mockedUsers[0]),
                            getOneWithRelations: jest.fn(() => mockedUsers[0]),
                            getBirthdayAnniversary: jest.fn(() => mockedUsers[0]),
                            getUsersWithRelationsByDateRange: jest.fn(() => mockedUsers),
                            findOneByCondition: jest.fn(() => mockedUsers[0]),
                        },
                    },
                ],
            })
            .overrideProvider(AuthGuard)
            .useValue(mockedAuthGuard)
            .overrideProvider(AuthService)
            .useValue({
                signIn: jest.fn(() => accessToken),
            })
            .overrideProvider(SlackService)
            .useValue({
                send: jest.fn(),
                sendError: jest.fn(),
                sendWarning: jest.fn(),
                sendInfo: jest.fn(),
            })
            .overrideProvider(UsersRepository)
            .useValue({
                create: jest.fn(() => mockedUsers[0]),
                findAll: jest.fn(() => mockedUsers),
                findOne: jest.fn(() => mockedUsers[0]),
                getOneWithRelations: jest.fn(() => mockedUsers[0]),
                getBirthdayAnniversary: jest.fn(() => mockedUsers[0]),
                getUsersWithRelationsByDateRange: jest.fn(() => mockedUsers),
                findOneByCondition: jest.fn(() => mockedUsers[0]),
            })
            .overrideProvider(UsersService)
            .useValue({
                getProfileAvatar: jest.fn(() => ({ file: '1_test.jpg', settings: { root: 'test/shared' } })),
                findOneById: jest.fn(() => mockedUsers[0]),
                create: jest.fn(() => mockedUsers[0]),
                findAll: jest.fn(() => mockedUsers),
                getBirthdayAnniversary: jest.fn(() => mockedUsers[0]),
                getUsersWithRelationsByDateRange: jest.fn(() => mockedUsers),
                getProfileAvatarPath: jest.fn(() => 'test/shared/1_test.jpg'),
                update: jest.fn(() => mockedUsers[0]),
                validateUserIdByRole: jest.fn(),
                uploadFile: jest.fn(),
            })
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        const loginReq = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'test@t-slen.com', password: '111' })
            .expect(200)
            .expect(({ body }) => {
                expect(body.accessToken).toBeDefined();
            });

        ACCESS_TOKEN = loginReq.body.accessToken;
    });

    afterAll(async () => {
        await app.close(); // Properly close the NestJS application
    });

    it('should be defined', () => {
        expect(app).toBeDefined();
    });

    it('/users (POST)', async () => {
        const mockedUser = mockedUsers[0];
        await request(app.getHttpServer())
            .post('/users')
            .send(mockedUser)
            .set('Authorization', 'Bearer ' + ACCESS_TOKEN)
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(mockedUsers[0]);
            });
    });
    it('/users (GET)', async () => {
        const mockUsers: Partial<Users>[] = [
            { id: 1, firstName: 'John', lastName: 'Doe' },
            { id: 2, firstName: 'Jane', lastName: 'Doe' },
        ];
        await request(app.getHttpServer())
            .get('/users')
            .set('Authorization', 'Bearer ' + ACCESS_TOKEN)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(mockUsers);
            });
    });
    it('/users/:id (GET)', async () => {
        const mockUser = { id: 1, firstName: 'John', lastName: 'Doe' };
        await request(app.getHttpServer())
            .get('/users/1')
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(mockUser);
            });
    });
    it('/birthday-anniversary (GET)', async () => {
        const mockUser = { id: 1, firstName: 'John', lastName: 'Doe' };
        await request(app.getHttpServer())
            .get('/users/birthday-anniversary')
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(mockUser);
            });
    });
    it('/users/get-with-relations-by-date-range (GET)', async () => {
        const mockUsers: Partial<Users>[] = [
            { id: 1, firstName: 'John', lastName: 'Doe' },
            { id: 2, firstName: 'Jane', lastName: 'Doe' },
        ]
        await request(app.getHttpServer())
            .get('/users/get-with-relations-by-date-range')
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(mockUsers);
            });
    });
    it('should allow for file uploads', async () => {
        return request(app.getHttpServer())
            .post('/users/profile-avatar/1')
            .attach('file', 'test/shared/1_test.jpg')
            .field('name', 'test')
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(mockedUsers[0]);
            });
    });
    it('/users/signup (POST)', async () => {
        const mockedUser = mockedUsers[0];
        await request(app.getHttpServer())
            .post('/users/signup')
            .send(mockedUser)
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual(mockedUsers[0]);
            });
    });
    it('/users/:id (PATCH)', async () => {
        await request(app.getHttpServer())
            .patch('/users/1')
            .send({ language: 'en' })
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(mockedUsers[0]);
            });
    });
});
