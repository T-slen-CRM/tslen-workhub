import { UserPayloadJwt } from '../../../../src/resources/auth/auth.service';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { Role } from '@tslen-workhub/shared';

describe('UserPayloadJwt', () => {
    it('does not carry password, tokenActivation, or tokenReset into the JWT session payload', () => {
        const user = Object.assign(new Users({}), {
            id: 1,
            email: 'user@example.com',
            role: Role.User,
            password: '$2b$10$hashedpassword',
            tokenActivation: 'activation-secret',
            tokenReset: 'reset-secret',
        });

        const payload = new UserPayloadJwt(user);

        expect(payload).not.toHaveProperty('password');
        expect(payload).not.toHaveProperty('tokenActivation');
        expect(payload).not.toHaveProperty('tokenReset');
        expect(payload.email).toBe('user@example.com');
    });
});
