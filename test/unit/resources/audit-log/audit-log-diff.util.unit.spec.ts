import { computeFieldDiff } from '../../../../src/resources/audit-log/audit-log-diff.util';

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
});
