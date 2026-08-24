import { of, throwError } from 'rxjs';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { AuditLogWsInterceptor } from '../../../../src/common/interceptors/audit-log-ws.interceptor';
import { AuditLogBufferService } from '../../../../src/resources/audit-log/audit-log-buffer.service';
import { pushAuditChange } from '../../../../src/common/audit-context.storage';

describe('AuditLogWsInterceptor', () => {
    function build () {
        const enqueue = jest.fn();
        const bufferService = { enqueue } as unknown as AuditLogBufferService;
        return { interceptor: new AuditLogWsInterceptor(bufferService), enqueue };
    }

    function buildContext (client: unknown, handlerName = 'updateTask'): ExecutionContext {
        return {
            switchToHttp: () => ({ getRequest: () => client }),
            getHandler: () => ({ name: handlerName }),
        } as unknown as ExecutionContext;
    }

    it('enqueues a WS audit entry with the socket user/ip and accumulated changes on success', (done) => {
        const { interceptor, enqueue } = build();
        const client = { user: { id: 7 }, handshake: { address: '9.9.9.9' } };
        // Simulate the subscriber pushing a change while the handler "runs".
        const wrappedHandler: CallHandler = { handle: () => {
            pushAuditChange({ entityName: 'Tasks', entityId: 42, action: 'update', fields: [{ field: 'phaseId', from: 3, to: 5 }] });
            return of({ id: 42 });
        } };

        interceptor.intercept(buildContext(client), wrappedHandler).subscribe(() => {
            expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({
                userId: 7, ip: '9.9.9.9', method: 'WS', route: 'updateTask', statusCode: 200,
                changes: [{ entityName: 'Tasks', entityId: 42, action: 'update', fields: [{ field: 'phaseId', from: 3, to: 5 }] }],
            }));
            done();
        });
    });

    it('records userId: null for an unauthenticated socket', (done) => {
        const { interceptor, enqueue } = build();
        const client = { handshake: { address: '9.9.9.9' } };
        const handler: CallHandler = { handle: () => of(undefined) };

        interceptor.intercept(buildContext(client), handler).subscribe(() => {
            expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ userId: null }));
            done();
        });
    });

    it('picks Tasks as resourceType over a Notification side effect, even when Notification was pushed first', (done) => {
        const { interceptor, enqueue } = build();
        const client = { user: { id: 7 }, handshake: { address: '9.9.9.9' } };
        const wrappedHandler: CallHandler = { handle: () => {
            pushAuditChange({ entityName: 'Notification', entityId: 3, action: 'insert', fields: [] });
            pushAuditChange({ entityName: 'Tasks', entityId: 42, action: 'update', fields: [{ field: 'assignee', to: 12 }] });
            return of(undefined);
        } };

        interceptor.intercept(buildContext(client), wrappedHandler).subscribe(() => {
            expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'Tasks', resourceId: '42' }));
            done();
        });
    });

    it('records a failure and re-throws the original error unchanged', (done) => {
        const { interceptor, enqueue } = build();
        const client = { user: { id: 7 }, handshake: { address: '9.9.9.9' } };
        const error = new Error('handler blew up');
        const handler: CallHandler = { handle: () => throwError(() => error) };

        interceptor.intercept(buildContext(client), handler).subscribe({
            error: (e) => {
                expect(e).toBe(error);
                expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
                done();
            },
        });
    });
});
