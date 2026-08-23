import { DataSource, InsertEvent, RemoveEvent, UpdateEvent } from 'typeorm';
import { AuditLogSubscriber } from '../../../../src/resources/audit-log/audit-log.subscriber';
import { AuditLogLabelResolverService } from '../../../../src/resources/audit-log/audit-log-label-resolver.service';
import { runWithAuditContext, finalizeAuditChanges } from '../../../../src/common/audit-context.storage';

describe('AuditLogSubscriber', () => {
    function build (resolveLabel: jest.Mock = jest.fn().mockResolvedValue(null)) {
        const fakeDataSource = { subscribers: [] } as unknown as DataSource;
        const labelResolverService = { resolveLabel } as unknown as AuditLogLabelResolverService;
        const subscriber = new AuditLogSubscriber(fakeDataSource, labelResolverService);
        return { subscriber, fakeDataSource, resolveLabel };
    }

    it('registers itself with the DataSource on construction', () => {
        const { fakeDataSource, subscriber } = build();

        expect(fakeDataSource.subscribers).toContain(subscriber);
    });

    it('afterUpdate pushes an update change for the fields that actually differ, with resolved labels', async () => {
        const { subscriber } = build(jest.fn().mockResolvedValue('In progress'));

        const result = await runWithAuditContext(async () => {
            await subscriber.afterUpdate({
                metadata: { name: 'Tasks' },
                entity: { id: 42, phaseId: 5 },
                databaseEntity: { id: 42, phaseId: 3 },
            } as unknown as UpdateEvent<any>);
            return finalizeAuditChanges();
        });

        expect(result).toEqual([{
            entityName: 'Tasks', entityId: 42, action: 'update',
            fields: [{ field: 'phaseId', from: 3, fromLabel: 'In progress', to: 5, toLabel: 'In progress' }],
        }]);
    });

    it('afterUpdate pushes nothing when nothing actually changed', async () => {
        const { subscriber } = build();

        const result = await runWithAuditContext(async () => {
            await subscriber.afterUpdate({
                metadata: { name: 'Tasks' },
                entity: { id: 42, phaseId: 3 },
                databaseEntity: { id: 42, phaseId: 3 },
            } as unknown as UpdateEvent<any>);
            return finalizeAuditChanges();
        });

        expect(result).toEqual([]);
    });

    it('afterInsert pushes an insert change for the new row', async () => {
        const { subscriber } = build();

        const result = await runWithAuditContext(async () => {
            await subscriber.afterInsert({
                metadata: { name: 'Tasks' },
                entity: { id: 42, title: 'New task' },
            } as unknown as InsertEvent<any>);
            return finalizeAuditChanges();
        });

        expect(result).toEqual([{
            entityName: 'Tasks', entityId: 42, action: 'insert',
            fields: [{ field: 'id', to: 42, toLabel: null }, { field: 'title', to: 'New task', toLabel: null }],
        }]);
    });

    it('beforeRemove pushes a delete change for the removed row', async () => {
        const { subscriber } = build();

        const result = await runWithAuditContext(async () => {
            await subscriber.beforeRemove({
                metadata: { name: 'Tasks' },
                databaseEntity: { id: 42, title: 'Old task' },
            } as unknown as RemoveEvent<any>);
            return finalizeAuditChanges();
        });

        expect(result).toEqual([{
            entityName: 'Tasks', entityId: 42, action: 'delete',
            fields: [{ field: 'id', from: 42, fromLabel: null }, { field: 'title', from: 'Old task', fromLabel: null }],
        }]);
    });

    it('does nothing and does not throw when called outside an active audit context', async () => {
        const { subscriber } = build();

        await expect(subscriber.afterUpdate({
            metadata: { name: 'Tasks' },
            entity: { id: 42, phaseId: 5 },
            databaseEntity: { id: 42, phaseId: 3 },
        } as unknown as UpdateEvent<any>)).resolves.toBeUndefined();
    });

    it('afterUpdate on Tasks reports a reassignment with both from and to, resolved from taskUserAssignmentRelations directly (not from a separate delete event)', async () => {
        const { subscriber, resolveLabel } = build(jest.fn().mockImplementation((field, id) => Promise.resolve(id === 7 ? 'Oleh Teslenko' : id === 12 ? 'John Smith' : null)));

        const result = await runWithAuditContext(async () => {
            await subscriber.afterUpdate({
                metadata: { name: 'Tasks' },
                entity: { id: 42, taskUserAssignmentRelations: [{ userId: 12 }] },
                databaseEntity: { id: 42, taskUserAssignmentRelations: [{ id: 1, taskId: 42, userId: 7 }] },
            } as unknown as UpdateEvent<any>);
            return finalizeAuditChanges();
        });

        expect(result).toEqual([{
            entityName: 'Tasks', entityId: 42, action: 'update',
            fields: [{ field: 'assignee', from: 7, fromLabel: 'Oleh Teslenko', to: 12, toLabel: 'John Smith' }],
        }]);
        expect(resolveLabel).toHaveBeenCalledWith('userId', 7);
        expect(resolveLabel).toHaveBeenCalledWith('userId', 12);
    });

    it('does not report an assignee change (or the raw relations array) when taskUserAssignmentRelations content is unchanged', async () => {
        const { subscriber } = build();

        const result = await runWithAuditContext(async () => {
            await subscriber.afterUpdate({
                metadata: { name: 'Tasks' },
                entity: { id: 42, title: 'new', taskUserAssignmentRelations: [{ id: 1, taskId: 42, userId: 7 }] },
                databaseEntity: { id: 42, title: 'old', taskUserAssignmentRelations: [{ id: 1, taskId: 42, userId: 7 }] },
            } as unknown as UpdateEvent<any>);
            return finalizeAuditChanges();
        });

        expect(result).toEqual([{
            entityName: 'Tasks', entityId: 42, action: 'update',
            fields: [{ field: 'title', from: 'old', to: 'new', fromLabel: null, toLabel: null }],
        }]);
    });

    it('suppresses TaskUserAssignmentRelation changes entirely (superseded by the Tasks-level assignee diff)', async () => {
        const { subscriber } = build();

        const result = await runWithAuditContext(async () => {
            await subscriber.afterInsert({
                metadata: { name: 'TaskUserAssignmentRelation' },
                entity: { id: 108, taskId: 42, userId: 12 },
            } as unknown as InsertEvent<any>);
            await subscriber.beforeRemove({
                metadata: { name: 'TaskUserAssignmentRelation' },
                databaseEntity: { id: 101, taskId: 42, userId: 7 },
            } as unknown as RemoveEvent<any>);
            return finalizeAuditChanges();
        });

        expect(result).toEqual([]);
    });
});
