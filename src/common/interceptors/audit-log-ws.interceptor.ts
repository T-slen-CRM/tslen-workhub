import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuditLogBufferService } from '../../resources/audit-log/audit-log-buffer.service';
import { AuditEntityChange, captureAuditContext, finalizeAuditChanges, runWithAuditContext } from '../audit-context.storage';

interface AuditableSocket {
    user?: { id?: number };
    handshake?: { address?: string };
}

// Entities that are always a side effect of an operation, never its subject -
// excluded from resourceType/resourceId selection so e.g. a Notification
// created as a side effect of a task reassignment doesn't outrank Tasks.
const SECONDARY_ENTITY_NAMES = new Set(['Notification', 'TaskUserAssignmentRelation']);

@Injectable()
export class AuditLogWsInterceptor implements NestInterceptor {
    constructor (private readonly auditLogBufferService: AuditLogBufferService) {}

    intercept (context: ExecutionContext, next: CallHandler): Observable<unknown> {
        // Matches this codebase's existing (if incidental) convention: AuthGuard
        // reads the socket via switchToHttp().getRequest() too, since Nest's WS
        // adapter indexes the raw handler args regardless of declared type.
        const client = context.switchToHttp().getRequest() as AuditableSocket;
        const eventName = context.getHandler().name;

        return runWithAuditContext(() => {
            // Captured synchronously here rather than re-querying
            // AsyncLocalStorage from inside tap()/catchError() later - see the
            // same fix (and the test that caught it) in AuditLogMiddleware.
            const auditContext = captureAuditContext();
            return next.handle().pipe(
                tap(() => this.record(auditContext, client, eventName, 200)),
                catchError((err) => {
                    this.record(auditContext, client, eventName, 500);
                    throw err;
                }),
            );
        });
    }

    private record (auditContext: unknown, client: AuditableSocket, eventName: string, statusCode: number): void {
        const changes = finalizeAuditChanges(auditContext);
        const primaryChange = changes.find((c) => !SECONDARY_ENTITY_NAMES.has(c.entityName)) as AuditEntityChange | undefined;

        this.auditLogBufferService.enqueue({
            userId: client.user?.id ?? null,
            ip: client.handshake?.address ?? '',
            userAgent: null,
            method: 'WS',
            route: eventName,
            resourceType: primaryChange?.entityName ?? null,
            resourceId: primaryChange?.entityId != null ? String(primaryChange.entityId) : null,
            statusCode,
            requestBody: null,
            changes: changes.length > 0 ? changes : null,
        });
    }
}
