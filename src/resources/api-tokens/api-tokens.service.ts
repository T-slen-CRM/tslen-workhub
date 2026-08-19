import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { ApiTokensRepository } from './api-tokens.repository';
import { ApiToken } from './entities/api-token.entity';
import { Users } from '../users/entities/users.entity';
import { generateApiToken } from './utils/hash-token';

@Injectable()
export class ApiTokensService extends BaseAbstractService<ApiToken> {
    constructor (
        protected readonly repository: ApiTokensRepository
    ) {
        super(repository, null);
        this.currentRepository = repository;
    }

    async createToken (user: Users, name: string): Promise<{ id: number; name: string; token: string; createdAt: Date }> {
        const { plaintext, hash } = generateApiToken();
        const saved = await this.repository.create({ token: hash, userId: user.id, name });
        return { id: saved.id, name: saved.name, token: plaintext, createdAt: saved.createdAt };
    }

    async findAllForUser (userId: number): Promise<{ id: number; name: string; createdAt: Date; lastUsedAt: Date }[]> {
        const tokens = await this.repository.findAllForUser(userId);
        // Never expose the stored hash or the eager `user` relation (which
        // carries the password hash) - this response only needs enough for
        // the caller to tell their own tokens apart.
        return tokens.map((token) => ({
            id: token.id,
            name: token.name,
            createdAt: token.createdAt,
            lastUsedAt: token.lastUsedAt,
        }));
    }

    async revoke (id: number, userId: number): Promise<void> {
        const token = await this.repository.findOne(id);
        if (!token || token.userId !== userId) {
            throw new NotFoundException('API token not found');
        }
        await this.repository.delete(id);
    }
}
