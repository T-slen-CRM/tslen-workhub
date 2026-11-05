import { INestApplication } from '@nestjs/common/interfaces/nest-application.interface';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import request = require('supertest');
import { AuthController } from '../../src/resources/auth/auth.controller';
import { AuthService } from '../../src/resources/auth/auth.service';

/**
 * The login endpoint must be rate-limited far tighter than the global
 * default (20/60s) to blunt password brute-forcing. This boots the real
 * AuthController behind the same ThrottlerGuard used in production, with
 * the production global default, so the only thing that can make an early
 * request 429 is a stricter per-route @Throttle on login itself.
 */
describe('Auth rate limiting (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }])],
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: { signInWithPassword: jest.fn().mockResolvedValue({ accessToken: 'x' }) },
                },
                { provide: APP_GUARD, useClass: ThrottlerGuard },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('blocks the 6th login attempt within the window (limit is 5/min, well under the global 20)', async () => {
        const body = { email: 'probe@example.invalid', password: 'whatever' };
        const codes: number[] = [];
        for (let i = 0; i < 6; i++) {
            const res = await request(app.getHttpServer()).post('/auth/login').send(body);
            codes.push(res.status);
        }
        // First 5 allowed (200), 6th throttled (429).
        expect(codes.slice(0, 5).every((c) => c === 200)).toBe(true);
        expect(codes[5]).toBe(429);
    });
});
