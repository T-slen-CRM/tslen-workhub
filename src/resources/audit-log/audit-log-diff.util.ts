const SENSITIVE_KEY_PATTERN = /password|token|secret|apikey/i;

export interface RawFieldDiff {
    field: string;
    from?: unknown;
    to?: unknown;
}

export function computeFieldDiff (
    newValues: Record<string, unknown> | undefined,
    oldValues: Record<string, unknown> | undefined
): RawFieldDiff[] {
    const keys = new Set([
        ...(newValues ? Object.keys(newValues) : []),
        ...(oldValues ? Object.keys(oldValues) : []),
    ]);
    const diffs: RawFieldDiff[] = [];

    for (const key of keys) {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
            continue;
        }
        const hasNew = !!newValues && key in newValues;
        const hasOld = !!oldValues && key in oldValues;

        if (hasNew && hasOld) {
            if (!valuesEqual(oldValues[key], newValues[key])) {
                diffs.push({ field: key, from: oldValues[key], to: newValues[key] });
            }
        } else if (hasNew) {
            diffs.push({ field: key, to: newValues[key] });
        } else if (hasOld) {
            diffs.push({ field: key, from: oldValues[key] });
        }
    }
    return diffs;
}

function valuesEqual (a: unknown, b: unknown): boolean {
    if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
    }
    return a === b;
}
