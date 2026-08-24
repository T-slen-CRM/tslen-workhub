import { collapseRelationPairs, computeFieldDiff, pickColumns } from '../../../../src/resources/audit-log/audit-log-diff.util';
import { AuditEntityChange } from '../../../../src/common/audit-context.storage';

describe('pickColumns', () => {
    it('keeps only the listed keys', () => {
        expect(pickColumns({ id: 1, title: 'x', actorUserId: 2 }, ['id', 'title'])).toEqual({ id: 1, title: 'x' });
    });

    it('omits a listed key that is not present on the entity at all, rather than adding it as undefined', () => {
        expect(pickColumns({ id: 1 }, ['id', 'title'])).toEqual({ id: 1 });
    });

    it('returns undefined for an undefined entity', () => {
        expect(pickColumns(undefined, ['id'])).toBeUndefined();
    });
});

describe('computeFieldDiff', () => {
    it('returns only the fields that actually changed, for an update', () => {
        const result = computeFieldDiff({ id: 1, title: 'new', phaseId: 5 }, { id: 1, title: 'old', phaseId: 5 });

        expect(result).toEqual([{ field: 'title', from: 'old', to: 'new' }]);
    });

    it('excludes sensitive field names entirely, even when changed', () => {
        const result = computeFieldDiff({ id: 1, password: 'new-hash' }, { id: 1, password: 'old-hash' });

        expect(result).toEqual([]);
    });

    it('treats equal Date instants as unchanged, even as different object instances', () => {
        const result = computeFieldDiff({ id: 1, updatedAt: new Date('2026-01-01T00:00:00Z') }, { id: 1, updatedAt: new Date('2026-01-01T00:00:00Z') });

        expect(result).toEqual([]);
    });

    it('an insert (no oldValues) reports every field as newly set, with no "from"', () => {
        const result = computeFieldDiff({ id: 1, title: 'x' }, undefined);

        expect(result).toEqual([{ field: 'id', to: 1 }, { field: 'title', to: 'x' }]);
    });

    it('a delete (no newValues) reports every field as removed, with no "to"', () => {
        const result = computeFieldDiff(undefined, { id: 1, title: 'x' });

        expect(result).toEqual([{ field: 'id', from: 1 }, { field: 'title', from: 'x' }]);
    });

    it('excludes undefined-valued fields (unloaded relation placeholders on the entity object), unlike a real null', () => {
        expect(computeFieldDiff({ id: 1, phases: undefined }, undefined)).toEqual([{ field: 'id', to: 1 }]);
        expect(computeFieldDiff({ id: 1, description: null }, undefined)).toEqual([{ field: 'id', to: 1 }, { field: 'description', to: null }]);
        expect(computeFieldDiff({ id: 1, phases: undefined }, { id: 1, phases: undefined })).toEqual([]);
    });

    it('treats two arrays with equal content as unchanged, even as different instances (eager relation arrays get a fresh instance per load)', () => {
        expect(computeFieldDiff({ id: 1, taskAttachments: [] }, { id: 1, taskAttachments: [] })).toEqual([]);
        expect(computeFieldDiff({ id: 1, taskAttachments: [{ id: 5 }] }, { id: 1, taskAttachments: [{ id: 5 }] })).toEqual([]);
    });

    it('still reports an array field as changed when its content actually differs', () => {
        expect(computeFieldDiff({ id: 1, taskAttachments: [{ id: 6 }] }, { id: 1, taskAttachments: [{ id: 5 }] }))
            .toEqual([{ field: 'taskAttachments', from: [{ id: 5 }], to: [{ id: 6 }] }]);
    });

    it('falls back to reference equality if array content is not JSON-safe (e.g. a circular relation), instead of throwing', () => {
        const circular: Record<string, unknown> = { id: 1 };
        circular.self = circular;
        const array = [circular];

        expect(() => computeFieldDiff({ id: 1, rel: array }, { id: 1, rel: array })).not.toThrow();
        expect(computeFieldDiff({ id: 1, rel: array }, { id: 1, rel: array })).toEqual([]);
    });
});

describe('collapseRelationPairs', () => {
    it('merges a delete+insert pair on TaskUserAssignmentRelation into one synthetic assignee change on the parent Tasks entity', () => {
        const changes: AuditEntityChange[] = [
            { entityName: 'TaskUserAssignmentRelation', entityId: 101, action: 'delete', fields: [{ field: 'taskId', from: 42 }, { field: 'userId', from: 7, fromLabel: 'Oleh Teslenko' }] },
            { entityName: 'TaskUserAssignmentRelation', entityId: 108, action: 'insert', fields: [{ field: 'taskId', to: 42 }, { field: 'userId', to: 12, toLabel: 'John Smith' }] },
        ];

        const result = collapseRelationPairs(changes);

        expect(result).toEqual([
            { entityName: 'Tasks', entityId: 42, action: 'update', fields: [
                { field: 'assignee', from: 7, fromLabel: 'Oleh Teslenko', to: 12, toLabel: 'John Smith' },
            ] },
        ]);
    });

    it('an insert with no matching delete reads as a new assignment (no "from") - this is the reliable case: a first-time assignment', () => {
        const changes: AuditEntityChange[] = [
            { entityName: 'TaskUserAssignmentRelation', entityId: 108, action: 'insert', fields: [{ field: 'taskId', to: 42 }, { field: 'userId', to: 12, toLabel: 'John Smith' }] },
        ];

        expect(collapseRelationPairs(changes)).toEqual([
            { entityName: 'Tasks', entityId: 42, action: 'update', fields: [{ field: 'assignee', to: 12, toLabel: 'John Smith' }] },
        ]);
    });

    it('a delete with no matching insert reads as unassigned (no "to")', () => {
        const changes: AuditEntityChange[] = [
            { entityName: 'TaskUserAssignmentRelation', entityId: 101, action: 'delete', fields: [{ field: 'taskId', from: 42 }, { field: 'userId', from: 7, fromLabel: 'Oleh Teslenko' }] },
        ];

        expect(collapseRelationPairs(changes)).toEqual([
            { entityName: 'Tasks', entityId: 42, action: 'update', fields: [{ field: 'assignee', from: 7, fromLabel: 'Oleh Teslenko' }] },
        ]);
    });

    it('merges the synthetic assignee field into an existing Tasks change for the same task, instead of a duplicate entry', () => {
        const changes: AuditEntityChange[] = [
            { entityName: 'Tasks', entityId: 42, action: 'update', fields: [{ field: 'phaseId', from: 3, to: 5 }] },
            { entityName: 'TaskUserAssignmentRelation', entityId: 108, action: 'insert', fields: [{ field: 'taskId', to: 42 }, { field: 'userId', to: 12, toLabel: 'John Smith' }] },
        ];

        const result = collapseRelationPairs(changes);

        expect(result).toEqual([
            { entityName: 'Tasks', entityId: 42, action: 'update', fields: [
                { field: 'phaseId', from: 3, to: 5 },
                { field: 'assignee', to: 12, toLabel: 'John Smith' },
            ] },
        ]);
    });

    it('leaves unrelated entity changes untouched', () => {
        const changes: AuditEntityChange[] = [
            { entityName: 'Users', entityId: 3, action: 'update', fields: [{ field: 'email', from: 'a@x.com', to: 'b@x.com' }] },
        ];

        expect(collapseRelationPairs(changes)).toEqual(changes);
    });
});
