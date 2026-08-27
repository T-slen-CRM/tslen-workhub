import { encryptToken, decryptToken } from '../../../../src/resources/meeting-links/utils/token-cipher';

describe('token-cipher', () => {
    const originalEnv = process.env.MEETING_LINK_TOKEN_KEY;

    beforeAll(() => {
        process.env.MEETING_LINK_TOKEN_KEY = 'a'.repeat(64);
    });

    afterAll(() => {
        process.env.MEETING_LINK_TOKEN_KEY = originalEnv;
    });

    it('decrypts back to the original plaintext', () => {
        const plaintext = 'b'.repeat(64);

        const encrypted = encryptToken(plaintext);
        const decrypted = decryptToken(encrypted);

        expect(decrypted).toBe(plaintext);
    });

    it('produces a different ciphertext each time for the same plaintext (random IV)', () => {
        const plaintext = 'c'.repeat(64);

        const first = encryptToken(plaintext);
        const second = encryptToken(plaintext);

        expect(first).not.toBe(second);
        expect(decryptToken(first)).toBe(plaintext);
        expect(decryptToken(second)).toBe(plaintext);
    });

    it('throws when the ciphertext has been tampered with', () => {
        const encrypted = encryptToken('d'.repeat(64));
        const tampered = encrypted.slice(0, -2) + (encrypted.slice(-2) === '00' ? '11' : '00');

        expect(() => decryptToken(tampered)).toThrow();
    });
});
