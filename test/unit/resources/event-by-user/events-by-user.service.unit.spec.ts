import { EventsByUserService } from '../../../../src/resources/events-by-user/events-by-user.service';
import { TestBed } from '@automock/jest';
import { mockedDateRangeDto, mockedEventByUser } from '../../../shared/event-by-user';
import { mockUser } from '../../../shared/users';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { EventsByUser } from '../../../../src/resources/events-by-user/entities/events-by-user.entity';
import { EventsByUserRepository } from '../../../../src/resources/events-by-user/events-by-user.repository';
import { MeetingLinksService } from '../../../../src/resources/meeting-links/meeting-links.service';
import { CreateEventsByUserDto } from '../../../../src/resources/events-by-user/dto/create-events-by-user.dto';
import { CryptoService } from '../../../../src/common/services/crypto/crypto.service';
import { MailService } from '../../../../src/common/services/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { UpdateEventsByUserDto } from '../../../../src/resources/events-by-user/dto/update-events-by-user.dto';
import { encryptToken } from '../../../../src/resources/meeting-links/utils/token-cipher';
import { MeetingLink } from '../../../../src/resources/meeting-links/entities/meeting-link.entity';

describe('EventsByUserService', () => {
    let service: EventsByUserService;
    let repository: jest.Mocked<EventsByUserRepository>;
    let meetingLinksService: jest.Mocked<MeetingLinksService>;
    let mailService: jest.Mocked<MailService>;
    let configService: jest.Mocked<ConfigService>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(EventsByUserService).compile();
        service = unit;
        repository = unitRef.get(EventsByUserRepository);
        meetingLinksService = unitRef.get(MeetingLinksService);
        mailService = unitRef.get(MailService);
        configService = unitRef.get(ConfigService);
        unitRef.get(CryptoService).encrypt.mockResolvedValue('generated-secret-token');
        configService.get.mockReturnValue('https://crm.t-slen.com');
    });

    const originalTokenKeyEnv = process.env.MEETING_LINK_TOKEN_KEY;
    beforeAll(() => {
        process.env.MEETING_LINK_TOKEN_KEY = 'a'.repeat(64);
    });
    afterAll(() => {
        process.env.MEETING_LINK_TOKEN_KEY = originalTokenKeyEnv;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should get events by month', async () => {
        const result = [mockedEventByUser]
        jest.spyOn(service, 'getEventsByMonth').mockResolvedValue(result as unknown as EventsByUser[]);
        const res = await service.getEventsByMonth(mockUser as unknown as Users, mockedDateRangeDto);
        expect(res).toEqual(result);
    });
    it('should get absent today', async () => {
        const result = [mockedEventByUser]
        jest.spyOn(service, 'getAbsentToday').mockResolvedValue(result as unknown as EventsByUser[]);
        const res = await service.getAbsentToday(mockUser as unknown as Users);
        expect(res).toEqual(result);
    });
    it('should get pending', async () => {
        const result = [mockedEventByUser];
        jest.spyOn(service, 'getPending').mockResolvedValue(result as unknown as EventsByUser[]);
        const res = await service.getPending(mockUser as unknown as Users);
        expect(res).toEqual(result);
    });
    it('should call approveDisapproveEvent', async () => {
        const result = { status: 'ok' };
        jest.spyOn(service, 'approveDisapproveEvent').mockResolvedValue(result);
        const res = await service.approveDisapproveEvent('token', 1);
        expect(res).toEqual(result);
    });
    it('should call generateSecretToken', () => {
        const value = new Promise((resolve: (value: string)=>void) => resolve('test'));
        jest.spyOn(service, 'generateSecretToken').mockReturnValue(value);
        const res = service.generateSecretToken(1);
        expect(res).toEqual(value);
    });

    describe('create', () => {
        it('creates a TSLen meet link when createTslenMeet is set and attaches its id to the event', async () => {
            meetingLinksService.createLink.mockResolvedValue({
                id: 42,
                token: 'plaintext-token',
                roomName: 'meeting-abc',
                title: 'Test',
                expiresAt: new Date(),
            });
            repository.createOneWithRelations.mockResolvedValue({
                event: { ...mockedEventByUser } as unknown as EventsByUser,
                userChiefEmails: [],
            });
            const dto = { ...mockedEventByUser, isGoogleEvent: false, createTslenMeet: true } as unknown as CreateEventsByUserDto;

            await service.create(dto, mockUser as unknown as Users);

            expect(meetingLinksService.createLink).toHaveBeenCalledWith(
                mockUser,
                expect.objectContaining({ title: dto.title }),
            );
            expect(dto.meetingLinkId).toBe(42);
        });

        it('does not create a TSLen meet link when createTslenMeet is not set, and clears meetingLinkId', async () => {
            repository.createOneWithRelations.mockResolvedValue({
                event: { ...mockedEventByUser } as unknown as EventsByUser,
                userChiefEmails: [],
            });
            const dto = { ...mockedEventByUser, isGoogleEvent: false, createTslenMeet: false } as unknown as CreateEventsByUserDto;

            await service.create(dto, mockUser as unknown as Users);

            expect(meetingLinksService.createLink).not.toHaveBeenCalled();
            expect(dto.meetingLinkId).toBeNull();
        });

        it('emails the event attendees an invite when createTslenMeet is set and attendees are present', async () => {
            meetingLinksService.createLink.mockResolvedValue({
                id: 42,
                token: 'plaintext-token',
                roomName: 'meeting-abc',
                title: 'Test',
                expiresAt: new Date(),
            });
            repository.createOneWithRelations.mockResolvedValue({
                event: { ...mockedEventByUser } as unknown as EventsByUser,
                userChiefEmails: [],
            });
            const dto = { ...mockedEventByUser, isGoogleEvent: false, createTslenMeet: true } as unknown as CreateEventsByUserDto;

            await service.create(dto, mockUser as unknown as Users);

            expect(mailService.sendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: ['Test'],
                template: './tslen-meet-invite.hbs',
                context: expect.objectContaining({
                    joinUrl: 'https://crm.t-slen.com/meet/plaintext-token',
                    googleCalendarLink: expect.stringContaining('https://calendar.google.com/calendar/render?'),
                }),
            }));
        });

        it('does not send an invite email when the event has no attendees', async () => {
            meetingLinksService.createLink.mockResolvedValue({
                id: 42,
                token: 'plaintext-token',
                roomName: 'meeting-abc',
                title: 'Test',
                expiresAt: new Date(),
            });
            repository.createOneWithRelations.mockResolvedValue({
                event: { ...mockedEventByUser, attendees: [] } as unknown as EventsByUser,
                userChiefEmails: [],
            });
            const dto = { ...mockedEventByUser, isGoogleEvent: false, createTslenMeet: true } as unknown as CreateEventsByUserDto;

            await service.create(dto, mockUser as unknown as Users);

            expect(mailService.sendMail).not.toHaveBeenCalled();
        });

        it('does not send an invite email when createTslenMeet is not set, even with attendees present', async () => {
            repository.createOneWithRelations.mockResolvedValue({
                event: { ...mockedEventByUser } as unknown as EventsByUser,
                userChiefEmails: [],
            });
            const dto = { ...mockedEventByUser, isGoogleEvent: false, createTslenMeet: false } as unknown as CreateEventsByUserDto;

            await service.create(dto, mockUser as unknown as Users);

            expect(mailService.sendMail).not.toHaveBeenCalled();
        });

        it('does not fail event creation when the invite email fails to send', async () => {
            meetingLinksService.createLink.mockResolvedValue({
                id: 42,
                token: 'plaintext-token',
                roomName: 'meeting-abc',
                title: 'Test',
                expiresAt: new Date(),
            });
            repository.createOneWithRelations.mockResolvedValue({
                event: { ...mockedEventByUser } as unknown as EventsByUser,
                userChiefEmails: [],
            });
            mailService.sendMail.mockRejectedValue(new Error('smtp down'));
            const dto = { ...mockedEventByUser, isGoogleEvent: false, createTslenMeet: true } as unknown as CreateEventsByUserDto;

            const result = await service.create(dto, mockUser as unknown as Users);

            expect(result.id).toEqual(mockedEventByUser.id);
        });

        it('attaches the newly created TSLen meet link onto the returned event, so it shows up without a page reload', async () => {
            const expiresAt = new Date();
            meetingLinksService.createLink.mockResolvedValue({
                id: 42,
                token: 'plaintext-token',
                roomName: 'meeting-abc',
                title: 'Test',
                expiresAt,
            });
            repository.createOneWithRelations.mockResolvedValue({
                event: { ...mockedEventByUser } as unknown as EventsByUser,
                userChiefEmails: [],
            });
            const dto = { ...mockedEventByUser, isGoogleEvent: false, createTslenMeet: true } as unknown as CreateEventsByUserDto;

            const result = await service.create(dto, mockUser as unknown as Users);

            expect(result.meetingLink).toEqual(expect.objectContaining({
                id: 42,
                roomName: 'meeting-abc',
                title: 'Test',
                expiresAt,
                revokedAt: null,
            }));
        });

        it('does not attach a TSLen meet link onto the returned event when createTslenMeet is not set', async () => {
            repository.createOneWithRelations.mockResolvedValue({
                event: { ...mockedEventByUser } as unknown as EventsByUser,
                userChiefEmails: [],
            });
            const dto = { ...mockedEventByUser, isGoogleEvent: false, createTslenMeet: false } as unknown as CreateEventsByUserDto;

            const result = await service.create(dto, mockUser as unknown as Users);

            expect(result.meetingLink).toBeUndefined();
        });
    });

    describe('update', () => {
        function makeEntity (overrides: Partial<EventsByUser> = {}): EventsByUser {
            return Object.assign(new EventsByUser({}), {
                id: 1,
                userId: 7,
                title: 'Standup',
                start: new Date('2026-09-10T09:00:00.000Z'),
                end: new Date('2026-09-10T09:30:00.000Z'),
                googleId: null,
                meetingLinkId: 42,
                meetingLink: Object.assign(new MeetingLink(), {
                    id: 42,
                    encryptedToken: encryptToken('plaintext-token'),
                    revokedAt: null,
                }),
                attendees: [{ userEmail: 'a@example.com' }],
                ...overrides,
            } as Partial<EventsByUser>);
        }

        it('emails attendees when the start time changes on an event with an active T-slen meet', async () => {
            const entity = makeEntity();
            repository.findOne.mockResolvedValue(entity);
            repository.updateOneWithRelations.mockImplementation(async (e) => e);
            const dto = { start: '2026-09-10T10:00:00.000Z' } as unknown as UpdateEventsByUserDto;

            await service.update(1, dto);

            expect(mailService.sendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: ['a@example.com'],
                template: './tslen-meet-rescheduled.hbs',
                context: expect.objectContaining({
                    joinUrl: 'https://crm.t-slen.com/meet/plaintext-token',
                    googleCalendarLink: expect.stringContaining('https://calendar.google.com/calendar/render?'),
                }),
            }));
        });

        it('emails attendees when only the end time changes', async () => {
            const entity = makeEntity();
            repository.findOne.mockResolvedValue(entity);
            repository.updateOneWithRelations.mockImplementation(async (e) => e);
            const dto = { end: '2026-09-10T10:00:00.000Z' } as unknown as UpdateEventsByUserDto;

            await service.update(1, dto);

            expect(mailService.sendMail).toHaveBeenCalledWith(expect.objectContaining({ template: './tslen-meet-rescheduled.hbs' }));
        });

        it('does not email when neither start nor end changes', async () => {
            const entity = makeEntity();
            repository.findOne.mockResolvedValue(entity);
            repository.updateOneWithRelations.mockImplementation(async (e) => e);
            const dto = { title: 'New title' } as unknown as UpdateEventsByUserDto;

            await service.update(1, dto);

            expect(mailService.sendMail).not.toHaveBeenCalled();
        });

        it('does not email when the new start/end matches the existing value', async () => {
            const entity = makeEntity();
            repository.findOne.mockResolvedValue(entity);
            repository.updateOneWithRelations.mockImplementation(async (e) => e);
            const dto = { start: entity.start.toISOString(), end: entity.end.toISOString() } as unknown as UpdateEventsByUserDto;

            await service.update(1, dto);

            expect(mailService.sendMail).not.toHaveBeenCalled();
        });

        it('does not email when the event has no T-slen meet', async () => {
            const entity = makeEntity({ meetingLinkId: null, meetingLink: null });
            repository.findOne.mockResolvedValue(entity);
            repository.updateOneWithRelations.mockImplementation(async (e) => e);
            const dto = { start: '2026-09-10T10:00:00.000Z' } as unknown as UpdateEventsByUserDto;

            await service.update(1, dto);

            expect(mailService.sendMail).not.toHaveBeenCalled();
        });

        it('does not email when there are no attendees', async () => {
            const entity = makeEntity({ attendees: [] });
            repository.findOne.mockResolvedValue(entity);
            repository.updateOneWithRelations.mockImplementation(async (e) => e);
            const dto = { start: '2026-09-10T10:00:00.000Z' } as unknown as UpdateEventsByUserDto;

            await service.update(1, dto);

            expect(mailService.sendMail).not.toHaveBeenCalled();
        });

        it('does not fail the update when the reschedule email fails to send', async () => {
            const entity = makeEntity();
            repository.findOne.mockResolvedValue(entity);
            repository.updateOneWithRelations.mockImplementation(async (e) => e);
            mailService.sendMail.mockRejectedValue(new Error('smtp down'));
            const dto = { start: '2026-09-10T10:00:00.000Z' } as unknown as UpdateEventsByUserDto;

            const result = await service.update(1, dto);

            expect(result.id).toBe(1);
        });
    });

    describe('delete', () => {
        it('revokes the attached TSLen meet link when the event has one', async () => {
            repository.findOne.mockResolvedValue({
                ...mockedEventByUser,
                meetingLinkId: 42,
                userId: 7,
            } as unknown as EventsByUser);

            await service.delete(1);

            expect(meetingLinksService.revoke).toHaveBeenCalledWith(42, 7);
        });

        it('does not call revoke when the event has no TSLen meet link', async () => {
            repository.findOne.mockResolvedValue({
                ...mockedEventByUser,
                meetingLinkId: null,
                userId: 7,
            } as unknown as EventsByUser);

            await service.delete(1);

            expect(meetingLinksService.revoke).not.toHaveBeenCalled();
        });
    });
});
