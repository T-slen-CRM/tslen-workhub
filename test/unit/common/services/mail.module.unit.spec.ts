import { buildMailerConfig } from '../../../../src/common/services/mail/mail.module';
import { ConfigService } from '@nestjs/config';

describe('buildMailerConfig', () => {
    function configServiceStub (values: Record<string, string>): ConfigService {
        return {
            getOrThrow: jest.fn((key: string) => {
                if (!(key in values)) {
                    throw new Error(`Config key "${key}" not found`);
                }
                return values[key];
            }),
            get: jest.fn((key: string) => values[key]),
        } as unknown as ConfigService;
    }

    it('uses implicit TLS (secure: true) for port 465 - the previous omission left prod silently defaulting to 587/no-TLS while EMAIL_PORT=465 sat unread', () => {
        const config = buildMailerConfig(configServiceStub({
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: '465',
            EMAIL_USERNAME: 'user',
            EMAIL_PASSWORD: 'pass',
            EMAIL_DEFAULT_SENDER: 'noreply@example.com',
        }));

        expect(config.transport.host).toBe('smtp.example.com');
        expect(config.transport.port).toBe(465);
        expect(config.transport.secure).toBe(true);
    });

    it('uses STARTTLS (secure: false) for port 587', () => {
        const config = buildMailerConfig(configServiceStub({
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: '587',
            EMAIL_USERNAME: 'user',
            EMAIL_PASSWORD: 'pass',
            EMAIL_DEFAULT_SENDER: 'noreply@example.com',
        }));

        expect(config.transport.port).toBe(587);
        expect(config.transport.secure).toBe(false);
    });

    it('defaults to port 587 (secure: false) when EMAIL_PORT is not set', () => {
        const config = buildMailerConfig(configServiceStub({
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_USERNAME: 'user',
            EMAIL_PASSWORD: 'pass',
            EMAIL_DEFAULT_SENDER: 'noreply@example.com',
        }));

        expect(config.transport.port).toBe(587);
        expect(config.transport.secure).toBe(false);
    });

    it('still wires host/auth/sender/template config through', () => {
        const config = buildMailerConfig(configServiceStub({
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: '465',
            EMAIL_USERNAME: 'user@example.com',
            EMAIL_PASSWORD: 'secret',
            EMAIL_DEFAULT_SENDER: 'T-slen <noreply@example.com>',
        }));

        expect(config.transport.auth).toEqual({ user: 'user@example.com', pass: 'secret' });
        expect(config.defaults.from).toBe('T-slen <noreply@example.com>');
        expect(config.template.options.strict).toBe(true);
    });
});
