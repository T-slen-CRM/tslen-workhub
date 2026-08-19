import { TestBed } from '@automock/jest';
import { NotFoundException } from '@nestjs/common';
import { ApiTokensService } from '../../../../src/resources/api-tokens/api-tokens.service';
import { ApiTokensRepository } from '../../../../src/resources/api-tokens/api-tokens.repository';
import { ApiToken } from '../../../../src/resources/api-tokens/entities/api-token.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { hashApiToken } from '../../../../src/resources/api-tokens/utils/hash-token';

describe('ApiTokensService', () => {
    let service: ApiTokensService;
    let repository: jest.Mocked<ApiTokensRepository>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(ApiTokensService).compile();
        service = unit;
        repository = unitRef.get(ApiTokensRepository);
    });

    describe('createToken', () => {
        it('stores a hash, not the plaintext, and returns the plaintext once', async () => {
            const user = { id: 7 } as Users;
            repository.create.mockImplementation(async (data: Partial<ApiToken>) => ({ ...data, id: 1, createdAt: new Date() } as ApiToken));

            const result = await service.createToken(user, 'Zapier integration');

            const [savedData] = repository.create.mock.calls[0];
            expect(savedData.token).toBe(hashApiToken(result.token));
            expect(savedData.token).not.toBe(result.token);
            expect(savedData.userId).toBe(7);
            expect(savedData.name).toBe('Zapier integration');
            expect(result.token).toMatch(/^[0-9a-f]{64}$/);
        });
    });

    describe('findAllForUser', () => {
        it('delegates to the repository, keyed by userId', async () => {
            const tokens = [{ id: 1, userId: 7, name: 'CI' }] as ApiToken[];
            repository.findAllForUser.mockResolvedValue(tokens);

            const result = await service.findAllForUser(7);

            expect(repository.findAllForUser).toHaveBeenCalledWith(7);
            expect(result).toEqual([{ id: 1, name: 'CI', createdAt: undefined, lastUsedAt: undefined }]);
        });

        it('never includes the stored token hash or the full user relation (which carries the password hash)', async () => {
            const createdAt = new Date();
            const lastUsedAt = new Date();
            const tokens = [{
                id: 1,
                userId: 7,
                name: 'CI',
                token: 'deadbeef'.repeat(8),
                createdAt,
                lastUsedAt,
                user: { id: 7, password: 'bcrypt-hash-should-never-leave-the-server' } as Users,
            }] as ApiToken[];
            repository.findAllForUser.mockResolvedValue(tokens);

            const result = await service.findAllForUser(7);

            expect(result).toEqual([{ id: 1, name: 'CI', createdAt, lastUsedAt }]);
            expect(JSON.stringify(result)).not.toContain('bcrypt-hash-should-never-leave-the-server');
            expect(JSON.stringify(result)).not.toContain('deadbeef');
        });
    });

    describe('revoke', () => {
        // Uses repository.findOne(id), NOT findOneByCondition(): the latter
        // calls TypeORM's Repository.findOne(options) with a bare
        // { id: ... } object instead of { where: { id: ... } }, which
        // throws "You must provide selection conditions in order to find a
        // single row" at runtime - reproduced against a live server while
        // manually testing this endpoint.
        it('deletes the token when owned by the caller', async () => {
            repository.findOne.mockResolvedValue({ id: 1, userId: 7 } as ApiToken);

            await service.revoke(1, 7);

            expect(repository.findOne).toHaveBeenCalledWith(1);
            expect(repository.delete).toHaveBeenCalledWith(1);
        });

        it('throws NotFoundException when the token does not belong to the caller', async () => {
            repository.findOne.mockResolvedValue({ id: 1, userId: 999 } as ApiToken);

            await expect(service.revoke(1, 7)).rejects.toThrow(NotFoundException);
            expect(repository.delete).not.toHaveBeenCalled();
        });

        it('throws NotFoundException when the token does not exist', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(service.revoke(1, 7)).rejects.toThrow(NotFoundException);
        });
    });
});
