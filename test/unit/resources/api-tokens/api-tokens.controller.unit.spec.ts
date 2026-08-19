import { TestBed } from '@automock/jest';
import { ApiTokensController } from '../../../../src/resources/api-tokens/api-tokens.controller';
import { ApiTokensService } from '../../../../src/resources/api-tokens/api-tokens.service';
import { ApiToken } from '../../../../src/resources/api-tokens/entities/api-token.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { mockUser } from '../../../shared/users';

describe('ApiTokensController', () => {
    let controller: ApiTokensController;
    let service: jest.Mocked<ApiTokensService>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(ApiTokensController).compile();
        controller = unit;
        service = unitRef.get(ApiTokensService);
    });

    describe('create', () => {
        it('creates a token for the authenticated user', async () => {
            const created = { id: 1, name: 'CI', token: 'abc123', createdAt: new Date() };
            service.createToken.mockResolvedValue(created);

            const result = await controller.create({ name: 'CI' }, mockUser as Users);

            expect(service.createToken).toHaveBeenCalledWith(mockUser, 'CI');
            expect(result).toBe(created);
        });
    });

    describe('findAll', () => {
        it('lists only the authenticated user\'s tokens', async () => {
            const tokens = [{ id: 1, userId: mockUser.id }] as ApiToken[];
            service.findAllForUser.mockResolvedValue(tokens);

            const result = await controller.findAll(mockUser as Users);

            expect(service.findAllForUser).toHaveBeenCalledWith(mockUser.id);
            expect(result).toBe(tokens);
        });
    });

    describe('revoke', () => {
        it('revokes a token owned by the authenticated user', async () => {
            await controller.revoke(5, mockUser as Users);

            expect(service.revoke).toHaveBeenCalledWith(5, mockUser.id);
        });
    });
});
