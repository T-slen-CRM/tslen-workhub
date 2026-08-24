import { flattenAuditLogRows } from './audit-log-row.util';
import { IAuditLog } from './interfaces/audit-log';

const baseLog: Omit<IAuditLog, 'id' | 'changes'> = {
    userId: 6,
    ip: '1.2.3.4',
    userAgent: null,
    method: 'PATCH',
    route: '/tasks/16',
    resourceType: 'Tasks',
    resourceId: '16',
    statusCode: 200,
    requestBody: null,
    createdAt: '2026-08-23T15:06:00.098Z',
};

describe('flattenAuditLogRows', () => {
    it('emits one row per field change, carrying the shared log metadata on each row', () => {
        const logs: IAuditLog[] = [{
            ...baseLog,
            id: 1,
            changes: [{
                entityName: 'Tasks', entityId: 16, action: 'update', fields: [
                    { field: 'title', from: 'NEW TASK', to: 'NEW TASK 1 1' },
                    { field: 'description', from: 'old', to: 'new' },
                ],
            }],
        }];

        const rows = flattenAuditLogRows(logs, new Map([[6, 'Oleh Teslenko']]));

        expect(rows).toEqual([
            { logId: 1, createdAt: baseLog.createdAt, userId: 6, userName: 'Oleh Teslenko', ip: '1.2.3.4', method: 'PATCH', resourceType: 'Tasks', resourceId: '16', statusCode: 200, entityName: 'Tasks', field: 'title', oldValue: 'NEW TASK', newValue: 'NEW TASK 1 1' },
            { logId: 1, createdAt: baseLog.createdAt, userId: 6, userName: 'Oleh Teslenko', ip: '1.2.3.4', method: 'PATCH', resourceType: 'Tasks', resourceId: '16', statusCode: 200, entityName: 'Tasks', field: 'description', oldValue: 'old', newValue: 'new' },
        ]);
    });

    it('flattens fields across multiple entity changes in one log entry, in order', () => {
        const logs: IAuditLog[] = [{
            ...baseLog,
            id: 1,
            changes: [
                { entityName: 'Tasks', entityId: 16, action: 'update', fields: [{ field: 'phaseId', from: 2, fromLabel: 'ToDo', to: 3, toLabel: 'Done' }] },
                { entityName: 'Notification', entityId: 9, action: 'insert', fields: [{ field: 'title', to: 'You were assigned a task' }] },
            ],
        }];

        const rows = flattenAuditLogRows(logs, new Map());

        expect(rows.map((r) => ({ entityName: r.entityName, field: r.field, oldValue: r.oldValue, newValue: r.newValue }))).toEqual([
            { entityName: 'Tasks', field: 'phaseId', oldValue: 'ToDo', newValue: 'Done' },
            { entityName: 'Notification', field: 'title', oldValue: null, newValue: 'You were assigned a task' },
        ]);
    });

    it('prefers the resolved label over the raw value when present', () => {
        const logs: IAuditLog[] = [{
            ...baseLog,
            id: 1,
            changes: [{ entityName: 'Tasks', entityId: 16, action: 'update', fields: [{ field: 'phaseId', from: 2, fromLabel: 'ToDo', to: 3, toLabel: 'Done' }] }],
        }];

        const rows = flattenAuditLogRows(logs, new Map());

        expect(rows[0].oldValue).toBe('ToDo');
        expect(rows[0].newValue).toBe('Done');
    });

    it('renders a null raw value as "none", and stringifies an object value, when no label is resolved', () => {
        const logs: IAuditLog[] = [{
            ...baseLog,
            id: 1,
            changes: [{
                entityName: 'Tasks', entityId: 16, action: 'update', fields: [
                    { field: 'description', from: null, to: 'new description' },
                    { field: 'meta', from: { a: 1 }, to: { a: 2 } },
                ],
            }],
        }];

        const rows = flattenAuditLogRows(logs, new Map());

        expect(rows[0]).toEqual(jasmine.objectContaining({ field: 'description', oldValue: 'none', newValue: 'new description' }));
        expect(rows[1]).toEqual(jasmine.objectContaining({ field: 'meta', oldValue: '{"a":1}', newValue: '{"a":2}' }));
    });

    it('sets oldValue/newValue to null (not the string "none") when the field has no from or no to at all', () => {
        const logs: IAuditLog[] = [{
            ...baseLog,
            id: 1,
            changes: [{ entityName: 'Tasks', entityId: 16, action: 'update', fields: [{ field: 'assignee', to: 12, toLabel: 'John Smith' }] }],
        }];

        const rows = flattenAuditLogRows(logs, new Map());

        expect(rows[0].oldValue).toBeNull();
        expect(rows[0].newValue).toBe('John Smith');
    });

    it('emits a single row with null field/oldValue/newValue for a log entry with no changes, so plain requests are not dropped', () => {
        const logs: IAuditLog[] = [{ ...baseLog, id: 1, changes: null }];

        const rows = flattenAuditLogRows(logs, new Map());

        expect(rows).toEqual([{
            logId: 1, createdAt: baseLog.createdAt, userId: 6, userName: '6', ip: '1.2.3.4', method: 'PATCH',
            resourceType: 'Tasks', resourceId: '16', statusCode: 200, entityName: null, field: null, oldValue: null, newValue: null,
        }]);
    });

    it('falls back to the raw userId (as a string) when no name is found in the map', () => {
        const logs: IAuditLog[] = [{ ...baseLog, id: 1, userId: 99, changes: null }];

        const rows = flattenAuditLogRows(logs, new Map([[6, 'Oleh Teslenko']]));

        expect(rows[0].userName).toBe('99');
    });

    it('returns an empty userName for a null userId', () => {
        const logs: IAuditLog[] = [{ ...baseLog, id: 1, userId: null, changes: null }];

        const rows = flattenAuditLogRows(logs, new Map());

        expect(rows[0].userName).toBe('');
    });

    it('returns an empty array for an empty logs array', () => {
        expect(flattenAuditLogRows([], new Map())).toEqual([]);
    });
});
