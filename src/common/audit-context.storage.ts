import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuditFieldChange {
    field: string;
    from?: unknown;
    fromLabel?: string | null;
    to?: unknown;
    toLabel?: string | null;
}

export interface AuditEntityChange {
    entityName: string;
    entityId: number | string;
    action: 'insert' | 'update' | 'delete';
    fields: AuditFieldChange[];
}

interface AuditContextStore {
    changes: AuditEntityChange[];
    droppedChangesCount: number;
}

export const AUDIT_CONTEXT_MAX_CHANGES = 200;

const auditContextStorage = new AsyncLocalStorage<AuditContextStore>();

export function runWithAuditContext<T> (fn: () => T): T {
    return auditContextStorage.run({ changes: [], droppedChangesCount: 0 }, fn);
}

export function pushAuditChange (change: AuditEntityChange): void {
    const store = auditContextStorage.getStore();
    if (!store) {
        return;
    }
    if (store.changes.length >= AUDIT_CONTEXT_MAX_CHANGES) {
        store.droppedChangesCount += 1;
        return;
    }
    store.changes.push(change);
}

export function finalizeAuditChanges (): AuditEntityChange[] {
    const store = auditContextStorage.getStore();
    if (!store) {
        return [];
    }
    const result = [...store.changes];
    if (store.droppedChangesCount > 0) {
        result.push({
            entityName: '__truncated__',
            entityId: 0,
            action: 'update',
            fields: [{ field: 'truncated', to: store.droppedChangesCount }],
        });
    }
    return result;
}
