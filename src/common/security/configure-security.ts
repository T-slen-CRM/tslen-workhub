import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

/**
 * Single entry point for HTTP security hardening, shared by main.ts's
 * bootstrap and the e2e test (test/integration/security-headers.e2e.spec.ts).
 *
 * helmet sets HSTS, X-Frame-Options, X-Content-Type-Options: nosniff,
 * Referrer-Policy, etc., and strips the X-Powered-By: Express fingerprint.
 *
 * Content-Security-Policy is intentionally left OFF: this service also
 * serves the Angular SPA (ServeStatic in app.module.ts), and helmet's
 * default `default-src 'self'` CSP would block the app's inline bootstrap
 * script/styles. A tailored CSP (with the frontend's real script/style
 * sources) should be introduced separately rather than shipping a broken
 * default here.
 */
export function configureSecurity (app: INestApplication): void {
    app.use(helmet({ contentSecurityPolicy: false }));

    // helmet already removes X-Powered-By, but disable it at the Express
    // layer too so the fingerprint can't leak if middleware ordering changes.
    const instance = app.getHttpAdapter().getInstance();
    if (instance && typeof instance.disable === 'function') {
        instance.disable('x-powered-by');
    }
}
