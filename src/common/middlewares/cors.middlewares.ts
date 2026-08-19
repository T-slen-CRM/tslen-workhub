import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as process from 'node:process';

@Injectable()
export class CorsMiddleware implements NestMiddleware {
    use (req: Request, res: Response, next: NextFunction) {
        const origin = req.headers.origin;

        // No Origin header at all means this isn't a browser cross-origin
        // request - CORS is a browser-enforced mechanism, and non-browser
        // callers (curl, Postman, external API clients, server-to-server)
        // never send this header. Let these through unconditionally; their
        // authorization comes from the route's own auth guard (JWT/API
        // token), not from CORS. Previously this fell back to a guessed
        // origin derived from the Host header, which rejected every
        // non-browser caller outright - including any real user of the
        // external API.
        if (!origin) {
            next();
            return;
        }

        const whitelistOrigin = [process.env.FRONT_DOMAIN];
        const publicPath: string[] = process.env.PUBLIC_PATH ? process.env.PUBLIC_PATH.split(',') : [];
        const isSpecialPath = publicPath.some((path) => req.path.includes(path));

        if (whitelistOrigin.includes(origin) || isSpecialPath) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,UPDATE,OPTIONS, PATCH');
            res.setHeader('Access-Control-Allow-Headers', 'Authorization, Origin, X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Observe');
            // Only reflect credentials for actually-whitelisted origins. Public
            // paths (PUBLIC_PATH) intentionally bypass the origin whitelist for
            // unauthenticated flows (OAuth callback, signup) — they must never
            // also advertise credentialed cross-origin access.
            if (whitelistOrigin.includes(origin)) {
                res.setHeader('Access-Control-Allow-Credentials', 'true');
            }
        } else {
            res.status(403).send('Not allowed by CORS');
            return;
        }
        if (req.method === 'OPTIONS') {
            res.sendStatus(204);
        } else {
            next();
        }
    }
}
