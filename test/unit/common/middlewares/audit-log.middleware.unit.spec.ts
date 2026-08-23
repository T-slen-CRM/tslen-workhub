import { EventEmitter } from 'events';
import { AuditLogMiddleware } from '../../../../src/common/middlewares/audit-log.middleware';
import { AuditLogBufferService } from '../../../../src/resources/audit-log/audit-log-buffer.service';

function buildRes (statusCode = 200) {
    const res = new EventEmitter() as unknown as { statusCode: number; on: EventEmitter['on']; emit: EventEmitter['emit'] };
    res.statusCode = statusCode;
    return res;
}

describe('AuditLogMiddleware', () => {
    function buildMiddleware () {
        const enqueue = jest.fn();
        const bufferService = { enqueue } as unknown as AuditLogBufferService;
        return { middleware: new AuditLogMiddleware(bufferService), enqueue };
    }

    it('does nothing for GET requests: calls next and never enqueues, even if finish fires', () => {
        const { middleware, enqueue } = buildMiddleware();
        const req: any = { method: 'GET' };
        const res = buildRes();
        const next = jest.fn();

        middleware.use(req, res as any, next);
        (res as unknown as EventEmitter).emit('finish');

        expect(next).toHaveBeenCalledTimes(1);
        expect(enqueue).not.toHaveBeenCalled();
    });

    it('calls next immediately for a mutation request, before the response finishes', () => {
        const { middleware } = buildMiddleware();
        const req: any = { method: 'POST', headers: {}, params: {} };
        const next = jest.fn();

        middleware.use(req, buildRes() as any, next);

        expect(next).toHaveBeenCalledTimes(1);
    });

    it('enqueues a full entry once the response finishes, with the final status code', () => {
        const { middleware, enqueue } = buildMiddleware();
        const req: any = {
            method: 'POST',
            user: { id: 7 },
            ip: '9.9.9.9',
            headers: { 'user-agent': 'jest' },
            route: { path: '/api/v1/tasks' },
            originalUrl: '/api/v1/tasks',
            params: {},
            body: { title: 'x', password: 'hunter2' },
        };
        const res = buildRes(201);

        middleware.use(req, res as any, jest.fn());
        (res as unknown as EventEmitter).emit('finish');

        expect(enqueue).toHaveBeenCalledWith({
            userId: 7,
            ip: '9.9.9.9',
            userAgent: 'jest',
            method: 'POST',
            route: '/api/v1/tasks',
            resourceType: 'tasks',
            resourceId: null,
            statusCode: 201,
            requestBody: { title: 'x', password: '[REDACTED]' },
        });
    });

    it('records a null userId for an unauthenticated request', () => {
        const { middleware, enqueue } = buildMiddleware();
        const req: any = {
            method: 'DELETE',
            ip: '9.9.9.9',
            headers: {},
            route: { path: '/api/v1/tasks/:id' },
            originalUrl: '/api/v1/tasks/42',
            params: { id: '42' },
            body: {},
        };
        const res = buildRes(401);

        middleware.use(req, res as any, jest.fn());
        (res as unknown as EventEmitter).emit('finish');

        expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({
            userId: null,
            resourceType: 'tasks',
            resourceId: '42',
            statusCode: 401,
        }));
    });
});
