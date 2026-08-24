import { buildAuditLogQuery } from './audit-log.service';

describe('buildAuditLogQuery', () => {
    it('returns an empty string when no filters are given', () => {
        expect(buildAuditLogQuery({})).toBe('');
    });

    it('returns an empty string for empty filter arrays', () => {
        expect(buildAuditLogQuery({ userIds: [], resourceTypes: [] })).toBe('');
    });

    it('builds a comma-joined userIds param', () => {
        expect(buildAuditLogQuery({ userIds: [3, 5] })).toBe('?userIds=3%2C5');
    });

    it('builds a comma-joined resourceTypes param', () => {
        expect(buildAuditLogQuery({ resourceTypes: ['Tasks', 'Notification'] })).toBe('?resourceTypes=Tasks%2CNotification');
    });

    it('combines both params when both are given', () => {
        expect(buildAuditLogQuery({ userIds: [3], resourceTypes: ['Tasks'] })).toBe('?userIds=3&resourceTypes=Tasks');
    });
});
