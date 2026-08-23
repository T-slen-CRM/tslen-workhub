import { DataSource, InsertEvent, RemoveEvent, UpdateEvent } from 'typeorm';
import { AuditLogSubscriber } from '../../../../src/resources/audit-log/audit-log.subscriber';
import { AuditLogLabelResolverService } from '../../../../src/resources/audit-log/audit-log-label-resolver.service';
import { runWithAuditContext, finalizeAuditChanges } from '../../../../src/common/audit-context.storage';

// Real TypeORM ColumnMetadata objects carry a lot more than propertyName,
// but the subscriber only reads that field to decide what's a real column.
function metaFor (name: string, columnNames: string[]) {
    return { name, columns: columnNames.map((propertyName) => ({ propertyName })) };
}

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
                metadata: metaFor('Tasks', ['id', 'phaseId']),
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
                metadata: metaFor('Tasks', ['id', 'phaseId']),
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
                metadata: metaFor('Tasks', ['id', 'title']),
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
                metadata: metaFor('Tasks', ['id', 'title']),
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
            metadata: metaFor('Tasks', ['id', 'phaseId']),
            entity: { id: 42, phaseId: 5 },
            databaseEntity: { id: 42, phaseId: 3 },
        } as unknown as UpdateEvent<any>)).resolves.toBeUndefined();
    });

    it('afterInsert/beforeRemove on TaskUserAssignmentRelation are captured like any other entity - collapsing into an assignee field happens downstream in collapseRelationPairs, not here', async () => {
        const { subscriber } = build();

        const result = await runWithAuditContext(async () => {
            await subscriber.afterInsert({
                metadata: metaFor('TaskUserAssignmentRelation', ['id', 'taskId', 'userId']),
                entity: { id: 108, taskId: 42, userId: 12 },
            } as unknown as InsertEvent<any>);
            await subscriber.beforeRemove({
                metadata: metaFor('TaskUserAssignmentRelation', ['id', 'taskId', 'userId']),
                databaseEntity: { id: 101, taskId: 42, userId: 7 },
            } as unknown as RemoveEvent<any>);
            return finalizeAuditChanges();
        });

        expect(result).toHaveLength(2);
        expect(result.map((c) => c.entityName)).toEqual(['TaskUserAssignmentRelation', 'TaskUserAssignmentRelation']);
    });

    it('ignores properties that are not real mapped columns, even if present on the raw entity object - DTO-only fields (e.g. actorUserId) and eager-loaded relations (which can carry a nested user object, including its password hash) must never reach the diff', async () => {
        const { subscriber } = build();

        const result = await runWithAuditContext(async () => {
            await subscriber.afterUpdate({
                metadata: metaFor('Tasks', ['id', 'title', 'description']),
                entity: {
                    id: 16,
                    title: 'NEW TASK 1 1',
                    description: 'aaaadsddd',
                    // Real fields sent by the frontend but not mapped @Column
                    // properties on Tasks - TypeORM ignores them for the SQL
                    // update, but they're still own-enumerable keys on the
                    // plain object the subscriber sees.
                    actorUserId: 1,
                    phaseName: 'none',
                    projectName: 'none',
                    createMeetingSpace: false,
                    previousTaskAttachments: [],
                    taskUserAssignmentRelations: [{
                        id: 3, taskId: 16, userId: 6,
                        user: { id: 6, email: 'user@example.com', password: '$2b$10$secrethash' },
                    }],
                },
                databaseEntity: {
                    id: 16,
                    title: 'NEW TASK',
                    description: 'aaaadsddd',
                    taskUserAssignmentRelations: [{ id: 3 }],
                },
            } as unknown as UpdateEvent<any>);
            return finalizeAuditChanges();
        });

        expect(result).toEqual([{
            entityName: 'Tasks', entityId: 16, action: 'update',
            fields: [{ field: 'title', from: 'NEW TASK', fromLabel: null, to: 'NEW TASK 1 1', toLabel: null }],
        }]);
    });
});
