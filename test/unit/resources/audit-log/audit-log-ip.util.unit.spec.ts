import { extractClientIp } from '../../../../src/resources/audit-log/audit-log-ip.util';

describe('extractClientIp', () => {
    it('prefers X-Forwarded-For over the direct (proxy) address', () => {
        expect(extractClientIp('203.0.113.7', '10.0.0.5')).toBe('203.0.113.7');
    });

    it('takes only the first hop of a multi-proxy X-Forwarded-For chain', () => {
        expect(extractClientIp('203.0.113.7, 10.0.0.5, 10.0.0.6', '10.0.0.6')).toBe('203.0.113.7');
    });

    it('falls back to the direct address when there is no X-Forwarded-For header (local dev, no proxy)', () => {
        expect(extractClientIp(undefined, '127.0.0.1')).toBe('127.0.0.1');
    });

    it('strips the ::ffff: IPv4-mapped-IPv6 prefix from the direct address', () => {
        expect(extractClientIp(undefined, '::ffff:127.0.0.1')).toBe('127.0.0.1');
    });

    it('strips the ::ffff: prefix from a forwarded address too', () => {
        expect(extractClientIp('::ffff:203.0.113.7', '10.0.0.5')).toBe('203.0.113.7');
    });

    it('takes the first value when the header arrives as an array', () => {
        expect(extractClientIp(['203.0.113.7', '203.0.113.8'], '10.0.0.5')).toBe('203.0.113.7');
    });

    it('returns null when neither a forwarded nor a direct address is available', () => {
        expect(extractClientIp(undefined, null)).toBeNull();
        expect(extractClientIp(undefined, undefined)).toBeNull();
    });

    it('trims whitespace around the forwarded address', () => {
        expect(extractClientIp(' 203.0.113.7 , 10.0.0.5', '10.0.0.5')).toBe('203.0.113.7');
    });
});
