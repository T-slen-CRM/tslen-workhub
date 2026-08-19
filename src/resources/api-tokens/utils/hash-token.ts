import { createHash, randomBytes } from 'crypto';

export function hashApiToken (plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex');
}

export function generateApiToken (): { plaintext: string; hash: string } {
    const plaintext = randomBytes(32).toString('hex');
    return { plaintext, hash: hashApiToken(plaintext) };
}
