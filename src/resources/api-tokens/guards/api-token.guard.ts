import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ApiTokensRepository } from '../api-tokens.repository';
import { hashApiToken } from '../utils/hash-token';

@Injectable()
export class ApiTokenGuard implements CanActivate {
    constructor (private readonly apiTokensRepository: ApiTokensRepository) {}

    async canActivate (context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new UnauthorizedException();
        }

        const apiToken = await this.apiTokensRepository.findByTokenHash(hashApiToken(token));
        if (!apiToken) {
            throw new UnauthorizedException();
        }

        request['user'] = apiToken.user;
        // Fire-and-forget - don't block the request on this write.
        this.apiTokensRepository.touchLastUsed(apiToken.id);

        return true;
    }

    private extractTokenFromHeader (request: Request): string | undefined {
        const [type, token] = request.headers?.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
