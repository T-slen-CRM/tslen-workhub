import { AUDIT_CONTEXT_MAX_CHANGES, finalizeAuditChanges, pushAuditChange, runWithAuditContext } from '../../../src/common/audit-context.storage';

describe('audit-context.storage', () => {
    it('finalizeAuditChanges returns an empty array when no context is active', () => {
        expect(finalizeAuditChanges()).toEqual([]);
    });

    it('pushAuditChange outside a context is a silent no-op', () => {
        expect(() => pushAuditChange({ entityName: 'Tasks', entityId: 1, action: 'update', fields: [] })).not.toThrow();
    });

    it('collects changes pushed during the context and returns them via finalizeAuditChanges', () => {
        const result = runWithAuditContext(() => {
            pushAuditChange({ entityName: 'Tasks', entityId: 1, action: 'update', fields: [{ field: 'title', from: 'a', to: 'b' }] });
            pushAuditChange({ entityName: 'Users', entityId: 2, action: 'insert', fields: [] });
            return finalizeAuditChanges();
        });

        expect(result).toEqual([
            { entityName: 'Tasks', entityId: 1, action: 'update', fields: [{ field: 'title', from: 'a', to: 'b' }] },
            { entityName: 'Users', entityId: 2, action: 'insert', fields: [] },
        ]);
    });

    it('propagates the context across an async continuation (the real-world case: middleware -> next() -> async service/repository calls)', async () => {
        const result = await runWithAuditContext(async () => {
            await Promise.resolve();
            pushAuditChange({ entityName: 'Tasks', entityId: 1, action: 'update', fields: [] });
            await Promise.resolve();
            return finalizeAuditChanges();
        });

        expect(result).toHaveLength(1);
    });

    it('appends a truncation marker once more than AUDIT_CONTEXT_MAX_CHANGES entries are pushed, instead of growing unbounded', () => {
        const result = runWithAuditContext(() => {
            for (let i = 0; i < AUDIT_CONTEXT_MAX_CHANGES + 5; i++) {
                pushAuditChange({ entityName: 'Tasks', entityId: i, action: 'update', fields: [] });
            }
            return finalizeAuditChanges();
        });

        expect(result).toHaveLength(AUDIT_CONTEXT_MAX_CHANGES + 1);
        expect(result[AUDIT_CONTEXT_MAX_CHANGES]).toEqual({
            entityName: '__truncated__', entityId: 0, action: 'update',
            fields: [{ field: 'truncated', to: 5 }],
        });
    });

    it('keeps separate contexts isolated across concurrent operations', async () => {
        const [a, b] = await Promise.all([
            runWithAuditContext(async () => {
                pushAuditChange({ entityName: 'Tasks', entityId: 1, action: 'update', fields: [] });
                await new Promise((resolve) => setTimeout(resolve, 5));
                return finalizeAuditChanges();
            }),
            runWithAuditContext(async () => {
                pushAuditChange({ entityName: 'Users', entityId: 2, action: 'update', fields: [] });
                return finalizeAuditChanges();
            }),
        ]);

        expect(a).toEqual([{ entityName: 'Tasks', entityId: 1, action: 'update', fields: [] }]);
        expect(b).toEqual([{ entityName: 'Users', entityId: 2, action: 'update', fields: [] }]);
    });
});
