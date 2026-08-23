import { AuditEntityChange, AuditFieldChange } from '../../common/audit-context.storage';

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
    return a === b;
}

interface AssignmentRelationRule {
    entityName: string;
    parentEntityName: string;
    parentIdField: string;
    userIdField: string;
    syntheticFieldName: string;
}

const ASSIGNMENT_RELATION_RULES: AssignmentRelationRule[] = [
    { entityName: 'TaskUserAssignmentRelation', parentEntityName: 'Tasks', parentIdField: 'taskId', userIdField: 'userId', syntheticFieldName: 'assignee' },
];

export function collapseRelationPairs (changes: AuditEntityChange[]): AuditEntityChange[] {
    return ASSIGNMENT_RELATION_RULES.reduce(collapseForRule, changes);
}

function collapseForRule (changes: AuditEntityChange[], rule: AssignmentRelationRule): AuditEntityChange[] {
    const relationChanges = changes.filter((c) => c.entityName === rule.entityName);
    if (relationChanges.length === 0) {
        return changes;
    }
    const others = changes.filter((c) => c.entityName !== rule.entityName);

    const byParent = new Map<string, { inserted?: AuditEntityChange; deleted?: AuditEntityChange }>();
    for (const change of relationChanges) {
        const direction = change.action === 'delete' ? 'from' : 'to';
        const parentId = fieldValue(change, rule.parentIdField, direction);
        if (parentId === undefined) {
            continue;
        }
        const bucket = byParent.get(String(parentId)) ?? {};
        if (change.action === 'insert') {
            bucket.inserted = change;
        }
        if (change.action === 'delete') {
            bucket.deleted = change;
        }
        byParent.set(String(parentId), bucket);
    }

    let result = others;
    for (const [parentId, { inserted, deleted }] of byParent) {
        const syntheticField: AuditFieldChange = { field: rule.syntheticFieldName };
        if (deleted) {
            syntheticField.from = fieldValue(deleted, rule.userIdField, 'from');
            syntheticField.fromLabel = fieldLabel(deleted, rule.userIdField, 'from');
        }
        if (inserted) {
            syntheticField.to = fieldValue(inserted, rule.userIdField, 'to');
            syntheticField.toLabel = fieldLabel(inserted, rule.userIdField, 'to');
        }
        result = mergeChange(result, {
            entityName: rule.parentEntityName,
            entityId: isNaN(Number(parentId)) ? parentId : Number(parentId),
            action: 'update',
            fields: [syntheticField],
        });
    }
    return result;
}

function fieldValue (change: AuditEntityChange, fieldName: string, direction: 'from' | 'to'): unknown {
    return change.fields.find((f) => f.field === fieldName)?.[direction];
}

function fieldLabel (change: AuditEntityChange, fieldName: string, direction: 'from' | 'to'): string | null | undefined {
    const field = change.fields.find((f) => f.field === fieldName);
    return direction === 'from' ? field?.fromLabel : field?.toLabel;
}

function mergeChange (changes: AuditEntityChange[], change: AuditEntityChange): AuditEntityChange[] {
    const existing = changes.find((c) => c.entityName === change.entityName && String(c.entityId) === String(change.entityId));
    if (existing) {
        existing.fields.push(...change.fields);
        return changes;
    }
    return [...changes, change];
}
