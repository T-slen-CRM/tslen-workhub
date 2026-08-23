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
        // undefined (as opposed to a real null) means this key is an unloaded
        // relation placeholder on the entity object, not real column data -
        // exclude it rather than reporting a spurious "changed to undefined".
        const hasNew = !!newValues && key in newValues && newValues[key] !== undefined;
        const hasOld = !!oldValues && key in oldValues && oldValues[key] !== undefined;

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
    if (Array.isArray(a) && Array.isArray(b)) {
        // TypeORM gives eager relation arrays a fresh instance on every load,
        // so a reference check (===) would flag e.g. two empty arrays as
        // "changed" on every single update. Fall back to === if the content
        // isn't JSON-safe (e.g. a circular relation back-reference).
        try {
            return JSON.stringify(a) === JSON.stringify(b);
        } catch {
            return a === b;
        }
    }
    return a === b;
}

interface AssigneeRelation {
    userId?: number | null;
}

/**
 * Diffs the single-assignee relation on a Tasks entity directly from its own
 * eager taskUserAssignmentRelations arrays, rather than from
 * TaskUserAssignmentRelation's own insert/delete subscriber events - those
 * are unreliable here because TypeORM's orphan-removal cascade for an eager
 * @OneToMany relation executes as a raw bulk DELETE, which never fires
 * beforeRemove/afterRemove. event.databaseEntity, by contrast, comes from a
 * fresh DB query done before the update, so it reliably has the old value.
 */
export function diffAssigneeUserId (
    newRelations: AssigneeRelation[] | undefined,
    oldRelations: AssigneeRelation[] | undefined
): { from?: number; to?: number } | null {
    const oldUserId = oldRelations?.[0]?.userId ?? undefined;
    const newUserId = newRelations?.[0]?.userId ?? undefined;
    if (oldUserId === newUserId) {
        return null;
    }
    const result: { from?: number; to?: number } = {};
    if (oldUserId !== undefined) {
        result.from = oldUserId;
    }
    if (newUserId !== undefined) {
        result.to = newUserId;
    }
    return result;
}
