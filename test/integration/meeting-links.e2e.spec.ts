import { INestApplication } from '@nestjs/common/interfaces/nest-application.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import request = require('supertest');
import { MeetingLinksController } from '../../src/resources/meeting-links/meeting-links.controller';
import { MeetingLinksService } from '../../src/resources/meeting-links/meeting-links.service';
import { MeetingLinksRepository } from '../../src/resources/meeting-links/meeting-links.repository';
import { MeetingGuestGuard } from '../../src/resources/meeting-links/guards/meeting-guest.guard';
import { AuthGuard } from '../../src/resources/auth/guards/auth.guard';
import { hashApiToken } from '../../src/resources/api-tokens/utils/hash-token';
import { encryptToken } from '../../src/resources/meeting-links/utils/token-cipher';

describe('MeetingLinksController (e2e)', () => {
    let app: INestApplication;
    let jwtService: JwtService;
    const originalTokenKey = process.env.MEETING_LINK_TOKEN_KEY;
    const validPlaintextToken = 'a'.repeat(64);
    const revokedPlaintextToken = 'b'.repeat(64);
    const expiredPlaintextToken = 'c'.repeat(64);
    const meetingLinkRow = {
        id: 1,
        token: hashApiToken(validPlaintextToken),
        encryptedToken: '',
        roomName: 'meeting-abc123',
        hostUserId: 7,
        title: 'Standup',
        expiresAt: null,
        revokedAt: null,
        host: { id: 7, firstName: 'Ada', lastName: 'Lovelace' },
    };
    const revokedMeetingLinkRow = {
        ...meetingLinkRow,
        id: 2,
        token: hashApiToken(revokedPlaintextToken),
        encryptedToken: '',
        roomName: 'meeting-revoked',
        revokedAt: new Date('2020-01-01T00:00:00.000Z'),
    };
    const expiredMeetingLinkRow = {
        ...meetingLinkRow,
        id: 3,
        token: hashApiToken(expiredPlaintextToken),
        encryptedToken: '',
        roomName: 'meeting-expired',
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
    };
    const rowsByTokenHash = new Map([
        [meetingLinkRow.token, meetingLinkRow],
        [revokedMeetingLinkRow.token, revokedMeetingLinkRow],
        [expiredMeetingLinkRow.token, expiredMeetingLinkRow],
    ]);

    beforeAll(async () => {
        process.env.MEETING_LINK_TOKEN_KEY = 'a'.repeat(64);
        meetingLinkRow.encryptedToken = encryptToken(validPlaintextToken);
        revokedMeetingLinkRow.encryptedToken = encryptToken(revokedPlaintextToken);
        expiredMeetingLinkRow.encryptedToken = encryptToken(expiredPlaintextToken);
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [MeetingLinksController],
            providers: [
                MeetingLinksService,
                {
                    provide: MeetingLinksRepository,
                    useValue: {
                        create: jest.fn().mockResolvedValue(meetingLinkRow),
                        findAllForHost: jest.fn().mockResolvedValue([meetingLinkRow]),
                        findOne: jest.fn().mockResolvedValue(meetingLinkRow),
                        findByTokenHash: jest.fn((hash: string) =>
                            Promise.resolve(rowsByTokenHash.get(hash) ?? null)),
                        save: jest.fn().mockResolvedValue({ ...meetingLinkRow, revokedAt: new Date() }),
                    },
                },
                MeetingGuestGuard,
                AuthGuard,
                { provide: APP_GUARD, useExisting: AuthGuard },
                JwtService,
                Reflector,
                { provide: ConfigService, useValue: { get: () => 'test-secret' } },
                {
                    provide: 'LIVEKIT_PACKAGE',
                    useValue: { getService: () => ({ LiveKitToken: () => of({ token: 'fake-livekit-jwt' }) }) },
                },
            ],
        }).compile();

        jwtService = moduleFixture.get(JwtService);
        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
        process.env.MEETING_LINK_TOKEN_KEY = originalTokenKey;
    });

    it('rejects creating a meeting link without a platform JWT', () => {
        return request(app.getHttpServer())
            .post('/meeting-links')
            .send({ title: 'Standup' })
            .expect(401);
    });

    it('creates a meeting link with a valid platform JWT', async () => {
        const token = await jwtService.signAsync({ user: { id: 7 } }, { secret: 'test-secret' });
        return request(app.getHttpServer())
            .post('/meeting-links')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Standup' })
            .expect(201);
    });

    it('revokes a meeting link owned by the caller', async () => {
        const token = await jwtService.signAsync({ user: { id: 7 } }, { secret: 'test-secret' });
        return request(app.getHttpServer())
            .delete('/meeting-links/1')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
    });

    it('returns public meeting info without any Authorization header', () => {
        return request(app.getHttpServer())
            .get(`/meeting-links/public/${validPlaintextToken}`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual({ title: 'Standup', hostName: 'Ada Lovelace', roomName: 'meeting-abc123' });
            });
    });

    it('returns 404, not 401, for an unknown token', () => {
        return request(app.getHttpServer())
            .get('/meeting-links/public/unknown-token')
            .expect(404);
    });

    it('lets an unauthenticated guest join and mints a LiveKit token', () => {
        return request(app.getHttpServer())
            .post(`/meeting-links/${validPlaintextToken}/join`)
            .send({ displayName: 'Visiting Guest' })
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual({ livekitToken: 'fake-livekit-jwt', roomName: 'meeting-abc123' });
            });
    });

    it.each([
        ['revoked', revokedPlaintextToken],
        ['expired', expiredPlaintextToken],
    ])('returns 410 Gone, not 401/403, when fetching public info for a %s link', (_label, token) => {
        return request(app.getHttpServer())
            .get(`/meeting-links/public/${token}`)
            .expect(410);
    });

    it.each([
        ['revoked', revokedPlaintextToken],
        ['expired', expiredPlaintextToken],
    ])('returns 410 Gone, not 401/403, when a guest tries to join through a %s link', (_label, token) => {
        return request(app.getHttpServer())
            .post(`/meeting-links/${token}/join`)
            .send({ displayName: 'Visiting Guest' })
            .expect(410);
    });

    it('lists the host\'s links with a redisplayable token, but never the stored hash or the host relation', async () => {
        const jwt = await jwtService.signAsync({ user: { id: 7 } }, { secret: 'test-secret' });
        return request(app.getHttpServer())
            .get('/meeting-links')
            .set('Authorization', `Bearer ${jwt}`)
            .expect(200)
            .expect(({ body }) => {
                expect(Array.isArray(body)).toBe(true);
                expect(body.length).toBeGreaterThan(0);
                // The plaintext token IS intentionally present here (hosts can
                // copy a link they created earlier) - what must never leak is
                // the stored one-way hash (the guest-lookup key) or the eager
                // `host` relation.
                const serialised = JSON.stringify(body);
                expect(serialised).toContain(validPlaintextToken);
                expect(serialised).not.toContain(meetingLinkRow.token);
                for (const row of body) {
                    expect(row.token).toBe(validPlaintextToken);
                    expect(Object.keys(row)).not.toContain('host');
                }
            });
    });

    it("rejects using a guest's LiveKit token as a platform Bearer JWT", () => {
        return request(app.getHttpServer())
            .get('/meeting-links')
            .set('Authorization', 'Bearer fake-livekit-jwt')
            .expect(401);
    });
});
