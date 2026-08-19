import { CorsMiddleware } from '../../../../src/common/middlewares/cors.middlewares';

describe('CorsMiddleware', () => {
    const originalEnv = process.env;
    let middleware: CorsMiddleware;

    beforeEach(() => {
        process.env = {
            ...originalEnv,
            FRONT_DOMAIN: 'https://crm.example.com',
            PUBLIC_PATH: 'auth/google-callback,company',
        };
        middleware = new CorsMiddleware();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    function fakeReqRes (path: string, origin?: string) {
        const headers: Record<string, string> = {};
        const req = { path, headers: { origin, host: 'ignored' }, method: 'GET' } as any;
        const res = {
            setHeader: (key: string, value: string) => { headers[key] = value; },
            status: () => res,
            send: () => undefined,
            sendStatus: () => undefined,
            headers,
        } as any;
        return { req, res };
    }

    it('sets Allow-Credentials for a whitelisted origin', () => {
        const { req, res } = fakeReqRes('/api/v1/tasks', 'https://crm.example.com');
        const next = jest.fn();

        middleware.use(req, res, next);

        expect(res.headers['Access-Control-Allow-Credentials']).toBe('true');
        expect(next).toHaveBeenCalled();
    });

    it('rejects a non-whitelisted origin on a non-public path', () => {
        const { req, res } = fakeReqRes('/api/v1/tasks', 'https://evil.example.com');
        res.status = jest.fn().mockReturnValue(res);
        res.send = jest.fn();
        const next = jest.fn();

        middleware.use(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('does not set Allow-Credentials for an arbitrary origin on a public path', () => {
        const { req, res } = fakeReqRes('/api/v1/auth/google-callback', 'https://evil.example.com');
        const next = jest.fn();

        middleware.use(req, res, next);

        expect(res.headers['Access-Control-Allow-Credentials']).toBeUndefined();
        expect(next).toHaveBeenCalled();
    });

    it('lets a request with no Origin header through unconditionally (non-browser callers, e.g. curl/Postman/external API clients)', () => {
        const { req, res } = fakeReqRes('/api/v1/external/tasks', undefined);
        const next = jest.fn();

        middleware.use(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined();
        expect(res.headers['Access-Control-Allow-Credentials']).toBeUndefined();
    });
});
