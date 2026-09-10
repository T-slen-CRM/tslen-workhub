const IPV4_MAPPED_PREFIX = '::ffff:';

// Node/Express represent an IPv4 client connecting to a dual-stack (IPv6)
// listener as "::ffff:<ipv4>" - without stripping this, every logged
// address in the audit log carries a prefix that reads as garbled rather
// than a real IP.
function stripIpv4MappedPrefix (ip: string): string {
    return ip.startsWith(IPV4_MAPPED_PREFIX) ? ip.slice(IPV4_MAPPED_PREFIX.length) : ip;
}

// This app runs behind a Traefik reverse proxy in production (see
// docker-compose.traefik.yml.example) - the socket that actually accepts
// the connection is Traefik's own, so req.ip / a WS handshake's address is
// the proxy's address, not the real client's, unless X-Forwarded-For is
// read explicitly. Prefers the header's first hop (the original client,
// per the standard left-to-right client->proxy chain convention), falling
// back to the direct address when there's no proxy in front (local dev).
export function extractClientIp (
    forwardedFor: string | string[] | undefined,
    directAddress: string | null | undefined
): string | null {
    const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const candidate = forwardedValue ? forwardedValue.split(',')[0].trim() : directAddress;
    if (!candidate) {
        return null;
    }
    return stripIpv4MappedPrefix(candidate);
}
