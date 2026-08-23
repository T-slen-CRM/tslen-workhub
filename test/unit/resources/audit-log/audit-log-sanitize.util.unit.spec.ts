import { sanitizeRequestBody } from '../../../../src/resources/audit-log/audit-log-sanitize.util';

describe('sanitizeRequestBody', () => {
    it('returns null for an empty body', () => {
        expect(sanitizeRequestBody(undefined)).toBeNull();
        expect(sanitizeRequestBody(null)).toBeNull();
        expect(sanitizeRequestBody({})).toBeNull();
    });

    it('redacts sensitive keys, case-insensitively, at the top level', () => {
        const result = sanitizeRequestBody({ title: 'Fix bug', password: 'hunter2', Token: 'abc' });

        expect(result).toEqual({ title: 'Fix bug', password: '[REDACTED]', Token: '[REDACTED]' });
    });

    it('redacts sensitive keys nested inside objects and arrays', () => {
        const result = sanitizeRequestBody({
            user: { email: 'a@b.com', apiKey: 'secret-value' },
            items: [{ refreshToken: 'xyz' }],
        });

        expect(result).toEqual({
            user: { email: 'a@b.com', apiKey: '[REDACTED]' },
            items: [{ refreshToken: '[REDACTED]' }],
        });
    });

    it('replaces the whole body with a truncation marker once the redacted JSON exceeds maxBytes', () => {
        const bigBody = { title: 'x'.repeat(50) };

        const result = sanitizeRequestBody(bigBody, 10);

        expect(result).toEqual({ truncated: true, originalSizeBytes: expect.any(Number) });
    });
});
