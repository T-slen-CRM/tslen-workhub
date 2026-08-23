import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AuditLogBufferService } from '../../resources/audit-log/audit-log-buffer.service';
import { sanitizeRequestBody } from '../../resources/audit-log/audit-log-sanitize.util';

const LOGGED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditLogMiddleware implements NestMiddleware {
    constructor (private readonly auditLogBufferService: AuditLogBufferService) {}

    use (req: Request, res: Response, next: NextFunction): void {
        if (!LOGGED_METHODS.has(req.method)) {
            next();
            return;
        }

        res.on('finish', () => {
            const user = (req as unknown as { user?: { id?: number } }).user;
            const route: string = (req.route?.path as string | undefined) ?? req.originalUrl;

            this.auditLogBufferService.enqueue({
                userId: user?.id ?? null,
                ip: req.ip,
                userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
                method: req.method,
                route,
                resourceType: this.extractResourceType(route),
                resourceId: req.params?.id ?? null,
                statusCode: res.statusCode,
                requestBody: sanitizeRequestBody(req.body),
            });
        });

        next();
    }

    private extractResourceType (route: string): string | null {
        const segments = route.split('/').filter(Boolean);
        const apiIndex = segments.indexOf('api');
        const candidate = apiIndex >= 0 ? segments[apiIndex + 2] : segments[0];
        return candidate ?? null;
    }
}
