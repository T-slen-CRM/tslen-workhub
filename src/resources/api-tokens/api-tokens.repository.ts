import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiToken } from './entities/api-token.entity';

export class ApiTokensRepository extends BaseAbstractRepository<ApiToken> {
    constructor (
        @InjectRepository(ApiToken)
        private readonly apiTokensRepository: Repository<ApiToken>
    ) {
        super(apiTokensRepository);
    }

    findAllForUser (userId: number): Promise<ApiToken[]> {
        return this.apiTokensRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    findByTokenHash (hash: string): Promise<ApiToken> {
        return this.apiTokensRepository.findOne({ where: { token: hash } });
    }

    touchLastUsed (id: number): Promise<void> {
        return this.apiTokensRepository.update(id, { lastUsedAt: new Date() }).then(() => undefined);
    }
}
