import { INestApplication } from '@nestjs/common/interfaces/nest-application.interface';
import { ExecutionContext } from '@nestjs/common/interfaces/features/execution-context.interface';
import { TestingModule } from '@nestjs/testing/testing-module';
import { AuthGuard } from '../../src/resources/auth/guards/auth.guard';
import { GoogleCalendar } from '../../src/resources/google-calendar/entities/google-calendar.entity';
import { Users } from '../../src/resources/users/entities/users.entity';
import { GoogleCalendarController } from '../../src/resources/google-calendar/google-calendar.controller';
import { GoogleCalendarService } from '../../src/resources/google-calendar/google-calendar.service';
import { GoogleCalendarRepository } from '../../src/resources/google-calendar/google-calendar.repository';
import { GoogleService } from '../../src/common/services/google/google.service';
import * as request from 'supertest';
import { ErrorService } from '../../src/common/services/error/error.service';
import { SlackService } from '../../src/common/services/slack/slack.service';
import { Test } from '@nestjs/testing/test';

describe('GoogleCalendar e2e', () => {
    let app: INestApplication;
    const mockResponse: GoogleCalendar = {
        id: 1,
        calendarId: 'test@gmail.com',
        timezone: 'Europe/Madrid',
        userId: 1,
        user: {} as Users
    };
    const mockUser = {} as Users;
    const mockedAuthGuard = { canActivate: (context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest();
        req.user = mockUser;
        return true;
    } };
    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test
            .createTestingModule({
                controllers: [GoogleCalendarController],
                providers: [
                    {
                        provide: GoogleCalendarService,
                        useValue: {
                            authorize: jest.fn(() => mockResponse),
                            remove: jest.fn(() => mockResponse),
                            createMeetingSpace: jest.fn(() => { return { uri: 'test' }; }),
                        },
                    },
                    {
                        provide: GoogleCalendarRepository,
                        useValue: {
                            findAll: jest.fn(() => [mockResponse]),
                            create: jest.fn(() => mockResponse),
                            update: jest.fn(() => mockResponse),
                            findOne: jest.fn(() => mockResponse),
                            save: jest.fn(() => mockResponse),
                            delete: jest.fn(() => mockResponse),
                            authorize: jest.fn(() => mockResponse),
                        },
                    },
                    ErrorService,
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
                        provide: GoogleService,
                        useValue: {
                            getCalendarEvents: jest.fn(),
                            createCalendarEvent: jest.fn(),
                            updateCalendarEvent: jest.fn(),
                            deleteCalendarEvent: jest.fn(),
                        }
                    }
                ],
            })
            .overrideGuard(AuthGuard)
            .useValue(mockedAuthGuard)
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
    it('should GET(/google-calendar/authorize)', async () => {
        await request(app.getHttpServer())
            .get('/google-calendar/authorize')
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(mockResponse);
            });
    });
    it('should DELETE (/google-calendar/:id)', async () => {
        await request(app.getHttpServer())
            .delete('/google-calendar/1')
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(mockResponse);
            });
    });
    it('should GET (/google-calendar/create-google-meeting)', async () => {
        await request(app.getHttpServer())
            .get('/google-calendar/create-google-meeting')
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual({ uri: 'test' });
            });
    });
})
