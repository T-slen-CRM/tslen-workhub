import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as process from 'node:process';

// Stamped on every response (registered via app.use in main.ts, not
// useGlobalInterceptors, so it also covers ServeStaticModule's responses -
// the compiled Angular bundle itself, not just /api/* routes) so the
// frontend's VersionCheckInterceptor can tell a redeploy happened without a
// separate polling endpoint: it just compares this header against the
// version baked into the bundle it's already running, on whatever request
// the user's next action happens to make.
@Injectable()
export class AppVersionMiddleware implements NestMiddleware {
    use (req: Request, res: Response, next: NextFunction) {
        res.setHeader('X-App-Version', process.env.GIT_SHA || 'dev');
        next();
    }
}
