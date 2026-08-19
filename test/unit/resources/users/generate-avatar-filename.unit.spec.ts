import { generateAvatarFilename } from '../../../../src/resources/users/utils/generate-avatar-filename';

describe('generateAvatarFilename', () => {
    it('never includes path separators or traversal sequences, even from a malicious original name', () => {
        const result = generateAvatarFilename('42', '../../../../etc/evil.sh');

        expect(result).not.toContain('/');
        expect(result).not.toContain('\\');
        expect(result).not.toContain('..');
    });

    it('preserves the file extension of a normal upload', () => {
        const result = generateAvatarFilename('42', 'photo.png');

        expect(result.endsWith('.png')).toBe(true);
    });

    it('includes the userId for traceability', () => {
        const result = generateAvatarFilename('42', 'photo.png');

        expect(result.startsWith('42_')).toBe(true);
    });
});
