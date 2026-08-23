import { computeFieldDiff, diffAssigneeUserId } from '../../../../src/resources/audit-log/audit-log-diff.util';

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

describe('diffAssigneeUserId', () => {
    it('returns null when both sides have the same assignee', () => {
        expect(diffAssigneeUserId([{ userId: 7 }], [{ userId: 7 }])).toBeNull();
    });

    it('returns null when neither side has an assignee', () => {
        expect(diffAssigneeUserId(undefined, undefined)).toBeNull();
        expect(diffAssigneeUserId([], [])).toBeNull();
    });

    it('reports a reassignment with both from and to', () => {
        expect(diffAssigneeUserId([{ userId: 12 }], [{ userId: 7 }])).toEqual({ from: 7, to: 12 });
    });

    it('reports a new assignment with no "from"', () => {
        expect(diffAssigneeUserId([{ userId: 12 }], [])).toEqual({ to: 12 });
    });

    it('reports an unassignment with no "to"', () => {
        expect(diffAssigneeUserId([], [{ userId: 7 }])).toEqual({ from: 7 });
    });
});
