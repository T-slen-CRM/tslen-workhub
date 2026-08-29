import { instanceToPlain } from 'class-transformer';
import { Role } from '@tslen-workhub/shared';
import { Users } from '../../../../src/resources/users/entities/users.entity';

describe('Users entity serialization', () => {
    it('excludes password, tokenActivation, and tokenReset from the serialized output', () => {
        const user = Object.assign(new Users({}), {
            id: 1,
            email: 'user@example.com',
            role: Role.User,
            password: '$2b$10$hashedpassword',
            tokenActivation: 'activation-secret',
            tokenReset: 'reset-secret',
        });

        const serialized = instanceToPlain(user);

        expect(serialized).not.toHaveProperty('password');
        expect(serialized).not.toHaveProperty('tokenActivation');
        expect(serialized).not.toHaveProperty('tokenReset');
        expect(serialized.email).toBe('user@example.com');
    });
});
