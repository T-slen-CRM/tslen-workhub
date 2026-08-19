import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.guard';
import { Socket } from 'socket.io';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor (
    private jwtService: JwtService,
    private configService: ConfigService,
    private reflector: Reflector
    ) {}

    async canActivate (context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new UnauthorizedException();
        }
        try {
            const payload = await this.jwtService.verifyAsync(
                token,
                {
                    secret: this.configService.get('JWT_SECRET'),
                }
            );
            request['user'] = payload.user;
        } catch {
            throw new UnauthorizedException();
        }
        return true;
    }

    private extractTokenFromHeader (request: Request): string | undefined {
        // find instance of request
        let authHeader = '';
        if (request instanceof Socket) {
            authHeader = request?.handshake?.headers?.authorization;
        } else {
            authHeader = request.headers?.authorization;
        }
        if (!authHeader) {
            return undefined;
        }
        const [type, token] = authHeader.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
