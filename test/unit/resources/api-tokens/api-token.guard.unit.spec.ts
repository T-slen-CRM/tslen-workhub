import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiTokenGuard } from '../../../../src/resources/api-tokens/guards/api-token.guard';
import { ApiTokensRepository } from '../../../../src/resources/api-tokens/api-tokens.repository';
import { ApiToken } from '../../../../src/resources/api-tokens/entities/api-token.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { hashApiToken } from '../../../../src/resources/api-tokens/utils/hash-token';

describe('ApiTokenGuard', () => {
    let guard: ApiTokenGuard;
    let repository: jest.Mocked<Pick<ApiTokensRepository, 'findByTokenHash' | 'touchLastUsed'>>;

    beforeEach(() => {
        repository = {
            findByTokenHash: jest.fn(),
            touchLastUsed: jest.fn().mockResolvedValue(undefined),
        };
        guard = new ApiTokenGuard(repository as unknown as ApiTokensRepository);
    });

    function contextWithAuthHeader (authorization?: string): ExecutionContext {
        const request: Record<string, unknown> = { headers: { authorization } };
        return {
            switchToHttp: () => ({ getRequest: () => request }),
        } as unknown as ExecutionContext;
    }

    it('sets request.user to the token owner for a valid token', async () => {
        const plaintext = 'a'.repeat(64);
        const apiToken = { id: 1, user: { id: 7 } as Users } as ApiToken;
        repository.findByTokenHash.mockResolvedValue(apiToken);
        const request: Record<string, unknown> = { headers: { authorization: `Bearer ${plaintext}` } };
        const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(request.user).toBe(apiToken.user);
        expect(repository.findByTokenHash).toHaveBeenCalledWith(hashApiToken(plaintext));
    });

    it('updates lastUsedAt for a valid token', async () => {
        const apiToken = { id: 42, user: { id: 7 } as Users } as ApiToken;
        repository.findByTokenHash.mockResolvedValue(apiToken);
        const context = contextWithAuthHeader('Bearer ' + 'a'.repeat(64));

        await guard.canActivate(context);

        expect(repository.touchLastUsed).toHaveBeenCalledWith(42);
    });

    it('rejects a missing Authorization header', async () => {
        const context = contextWithAuthHeader(undefined);

        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a header that is not a Bearer token', async () => {
        const context = contextWithAuthHeader('Basic somevalue');

        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an unknown token', async () => {
        repository.findByTokenHash.mockResolvedValue(null);
        const context = contextWithAuthHeader('Bearer ' + 'a'.repeat(64));

        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
});
