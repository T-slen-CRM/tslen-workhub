import { AppVersionMiddleware } from '../../../../src/common/middlewares/app-version.middleware';

describe('AppVersionMiddleware', () => {
    const originalEnv = process.env;
    let middleware: AppVersionMiddleware;

    afterEach(() => {
        process.env = originalEnv;
    });

    function fakeReqRes () {
        const headers: Record<string, string> = {};
        const req = {} as any;
        const res = {
            setHeader: (key: string, value: string) => { headers[key] = value; },
            headers,
        } as any;
        return { req, res };
    }

    it('stamps the response with GIT_SHA when set, so the frontend can detect a redeploy', () => {
        process.env = { ...originalEnv, GIT_SHA: 'abc1234' };
        middleware = new AppVersionMiddleware();
        const { req, res } = fakeReqRes();
        const next = jest.fn();

        middleware.use(req, res, next);

        expect(res.headers['X-App-Version']).toBe('abc1234');
        expect(next).toHaveBeenCalled();
    });

    it('falls back to "dev" when GIT_SHA is unset, matching the frontend build\'s own dev default', () => {
        process.env = { ...originalEnv };
        delete process.env.GIT_SHA;
        middleware = new AppVersionMiddleware();
        const { req, res } = fakeReqRes();
        const next = jest.fn();

        middleware.use(req, res, next);

        expect(res.headers['X-App-Version']).toBe('dev');
    });
});
