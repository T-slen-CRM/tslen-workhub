import { INestApplication } from '@nestjs/common/interfaces/nest-application.interface';
import { Controller, Get } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request = require('supertest');
import { configureSecurity } from '../../src/common/security/configure-security';

@Controller('ping')
class PingController {
    @Get()
    ping (): { ok: boolean } {
        return { ok: true };
    }
}

describe('Security headers (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [PingController],
        }).compile();

        app = moduleFixture.createNestApplication();
        // The single security hardening entry point, shared with main.ts's bootstrap.
        configureSecurity(app);
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('sets hardening headers and hides the Express fingerprint', async () => {
        const res = await request(app.getHttpServer()).get('/ping').expect(200);

        // helmet defaults we rely on
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['x-frame-options']).toBeDefined();
        expect(res.headers['strict-transport-security']).toBeDefined();

        // the stack fingerprint must not leak
        expect(res.headers['x-powered-by']).toBeUndefined();
    });
});
