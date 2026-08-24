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

/**
 * Captures a direct reference to the active store, to be read later via
 * finalizeAuditChanges(handle) from a callback that might not reliably
 * re-enter the AsyncLocalStorage context on its own (e.g. an EventEmitter
 * listener fired via .emit() well after it was registered) - capturing the
 * live object here, synchronously, sidesteps that uncertainty entirely.
 */
export function captureAuditContext (): unknown {
    return auditContextStorage.getStore();
}

export function finalizeAuditChanges (context?: unknown): AuditEntityChange[] {
    const store = (context as AuditContextStore | undefined) ?? auditContextStorage.getStore();
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
