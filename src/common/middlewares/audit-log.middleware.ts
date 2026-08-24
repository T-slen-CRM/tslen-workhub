import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AuditLogBufferService } from '../../resources/audit-log/audit-log-buffer.service';
import { sanitizeRequestBody } from '../../resources/audit-log/audit-log-sanitize.util';
import { collapseRelationPairs } from '../../resources/audit-log/audit-log-diff.util';
import { captureAuditContext, finalizeAuditChanges, runWithAuditContext, AuditEntityChange } from '../audit-context.storage';

const LOGGED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
// Entities that are always a side effect of an operation, never its subject -
// excluded from resourceType/resourceId selection so e.g. a Notification
// created as a side effect of a task reassignment doesn't outrank Tasks.
const SECONDARY_ENTITY_NAMES = new Set(['Notification', 'TaskUserAssignmentRelation']);

@Injectable()
export class AuditLogMiddleware implements NestMiddleware {
    constructor (private readonly auditLogBufferService: AuditLogBufferService) {}

    use (req: Request, res: Response, next: NextFunction): void {
        if (!LOGGED_METHODS.has(req.method)) {
            next();
            return;
        }

        // next() must run inside this callback so downstream async work (the
        // subscriber's pushAuditChange calls) sees the context. The 'finish'
        // handler can't reliably re-enter the AsyncLocalStorage context on its
        // own once it fires later via a real EventEmitter completion, so we
        // capture a direct reference to the store synchronously here instead.
        runWithAuditContext(() => {
            const auditContext = captureAuditContext();
            res.on('finish', () => {
                const user = (req as unknown as { user?: { id?: number } }).user;
                const route: string = (req.route?.path as string | undefined) ?? req.originalUrl;
                const changes = collapseRelationPairs(finalizeAuditChanges(auditContext));
                const primaryChange = changes.find((c) => !SECONDARY_ENTITY_NAMES.has(c.entityName)) as AuditEntityChange | undefined;

                this.auditLogBufferService.enqueue({
                    userId: user?.id ?? null,
                    ip: req.ip,
                    userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
                    method: req.method,
                    route,
                    resourceType: primaryChange ? primaryChange.entityName : this.extractResourceType(route),
                    resourceId: primaryChange ? String(primaryChange.entityId) : (req.params?.id ?? null),
                    statusCode: res.statusCode,
                    requestBody: sanitizeRequestBody(req.body),
                    changes: changes.length > 0 ? changes : null,
                });
            });

            next();
        });
    }

    private extractResourceType (route: string): string | null {
        const segments = route.split('/').filter(Boolean);
        const apiIndex = segments.indexOf('api');
        const candidate = apiIndex >= 0 ? segments[apiIndex + 2] : segments[0];
        return candidate ?? null;
    }
}
