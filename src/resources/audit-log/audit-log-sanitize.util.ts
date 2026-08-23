const REDACTED_VALUE = '[REDACTED]';
const SENSITIVE_KEY_PATTERN = /password|token|secret|apikey/i;
const DEFAULT_MAX_BYTES = 10_000;

function redactSensitiveFields (value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(redactSensitiveFields);
    }
    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, val]) => (
                SENSITIVE_KEY_PATTERN.test(key)
                    ? [key, REDACTED_VALUE]
                    : [key, redactSensitiveFields(val)]
            ))
        );
    }
    return value;
}

export function sanitizeRequestBody (body: unknown, maxBytes: number = DEFAULT_MAX_BYTES): Record<string, unknown> | null {
    if (body === null || body === undefined || typeof body !== 'object' || Object.keys(body).length === 0) {
        return null;
    }

    const redacted = redactSensitiveFields(body) as Record<string, unknown>;
    const sizeBytes = Buffer.byteLength(JSON.stringify(redacted));
    if (sizeBytes > maxBytes) {
        return { truncated: true, originalSizeBytes: sizeBytes };
    }
    return redacted;
}
