import { IAuditLog, IAuditLogRow } from './interfaces/audit-log';

export function flattenAuditLogRows (logs: IAuditLog[], userNames: Map<number, string>): IAuditLogRow[] {
    const rows: IAuditLogRow[] = [];
    for (const log of logs) {
        const base = {
            logId: log.id,
            createdAt: log.createdAt,
            userId: log.userId,
            userName: log.userId === null ? '' : (userNames.get(log.userId) ?? String(log.userId)),
            ip: log.ip,
            method: log.method,
            resourceType: log.resourceType,
            resourceId: log.resourceId,
            statusCode: log.statusCode,
        };
        const changes = log.changes ?? [];
        if (changes.length === 0) {
            rows.push({ ...base, entityName: null, field: null, oldValue: null, newValue: null });
            continue;
        }
        for (const change of changes) {
            for (const fieldChange of change.fields) {
                rows.push({
                    ...base,
                    entityName: change.entityName,
                    field: fieldChange.field,
                    oldValue: 'from' in fieldChange ? (fieldChange.fromLabel ?? formatValue(fieldChange.from)) : null,
                    newValue: 'to' in fieldChange ? (fieldChange.toLabel ?? formatValue(fieldChange.to)) : null,
                });
            }
        }
    }
    return rows;
}

function formatValue (value: unknown): string {
    if (value === null) {
        return 'none';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}
