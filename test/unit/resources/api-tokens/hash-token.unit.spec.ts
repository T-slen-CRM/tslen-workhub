import { generateApiToken, hashApiToken } from '../../../../src/resources/api-tokens/utils/hash-token';

describe('hash-token', () => {
    describe('generateApiToken', () => {
        it('produces a 64-character hex plaintext token', () => {
            const { plaintext } = generateApiToken();

            expect(plaintext).toMatch(/^[0-9a-f]{64}$/);
        });

        it('produces a hash matching hashApiToken(plaintext)', () => {
            const { plaintext, hash } = generateApiToken();

            expect(hash).toBe(hashApiToken(plaintext));
        });

        it('generates different tokens on each call', () => {
            const first = generateApiToken();
            const second = generateApiToken();

            expect(first.plaintext).not.toBe(second.plaintext);
        });
    });

    describe('hashApiToken', () => {
        it('is deterministic - the same input always hashes the same way', () => {
            const hashA = hashApiToken('some-token-value');
            const hashB = hashApiToken('some-token-value');

            expect(hashA).toBe(hashB);
        });

        it('produces a 64-character hex SHA-256 digest', () => {
            const hash = hashApiToken('some-token-value');

            expect(hash).toMatch(/^[0-9a-f]{64}$/);
        });
    });
});
