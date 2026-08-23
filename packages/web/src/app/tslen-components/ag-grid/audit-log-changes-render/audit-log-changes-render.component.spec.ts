import { AuditLogChangesRenderComponent, formatAuditChanges } from './audit-log-changes-render.component';
import { IAuditEntityChange } from '../../../admin/audit-log/interfaces/audit-log';

describe('formatAuditChanges', () => {
    it('returns an empty array for null or empty changes', () => {
        expect(formatAuditChanges(null)).toEqual([]);
        expect(formatAuditChanges([])).toEqual([]);
    });

    it('formats a field with both a label and a raw from/to as "field: from → to", preferring labels', () => {
        const changes: IAuditEntityChange[] = [
            { entityName: 'Tasks', entityId: 3, action: 'update', fields: [
                { field: 'phaseId', from: 2, fromLabel: 'ToDo', to: 3, toLabel: 'Done' },
            ] },
        ];

        expect(formatAuditChanges(changes)).toEqual(['phaseId: ToDo → Done']);
    });

    it('falls back to the raw value when no label was resolved', () => {
        const changes: IAuditEntityChange[] = [
            { entityName: 'Tasks', entityId: 3, action: 'update', fields: [{ field: 'title', from: 'old', to: 'new' }] },
        ];

        expect(formatAuditChanges(changes)).toEqual(['title: old → new']);
    });

    it('formats an insert-only field (no "from") as "field: → to"', () => {
        const changes: IAuditEntityChange[] = [
            { entityName: 'Tasks', entityId: 3, action: 'update', fields: [{ field: 'assignee', to: 12, toLabel: 'John Smith' }] },
        ];

        expect(formatAuditChanges(changes)).toEqual(['assignee: → John Smith']);
    });

    it('formats a delete-only field (no "to") as "field: from →"', () => {
        const changes: IAuditEntityChange[] = [
            { entityName: 'Tasks', entityId: 3, action: 'update', fields: [{ field: 'assignee', from: 7, fromLabel: 'Oleh Teslenko' }] },
        ];

        expect(formatAuditChanges(changes)).toEqual(['assignee: Oleh Teslenko →']);
    });

    it('renders a null value as "none", and stringifies an object value', () => {
        const changes: IAuditEntityChange[] = [
            { entityName: 'Tasks', entityId: 3, action: 'update', fields: [
                { field: 'description', from: null, to: 'new description' },
                { field: 'meta', from: { a: 1 }, to: { a: 2 } },
            ] },
        ];

        expect(formatAuditChanges(changes)).toEqual([
            'description: none → new description',
            'meta: {"a":1} → {"a":2}',
        ]);
    });

    it('flattens fields across multiple entity changes into one line list, in order', () => {
        const changes: IAuditEntityChange[] = [
            { entityName: 'Tasks', entityId: 3, action: 'update', fields: [{ field: 'phaseId', from: 2, fromLabel: 'ToDo', to: 3, toLabel: 'Done' }] },
            { entityName: 'Notification', entityId: 9, action: 'insert', fields: [{ field: 'title', to: 'You were assigned a task' }] },
        ];

        expect(formatAuditChanges(changes)).toEqual([
            'phaseId: ToDo → Done',
            'title: → You were assigned a task',
        ]);
    });
});

describe('AuditLogChangesRenderComponent', () => {
    it('agInit populates lines from params.value via formatAuditChanges', () => {
        const component = new AuditLogChangesRenderComponent();
        const changes: IAuditEntityChange[] = [
            { entityName: 'Tasks', entityId: 3, action: 'update', fields: [{ field: 'title', from: 'old', to: 'new' }] },
        ];

        component.agInit({ value: changes });

        expect(component.lines).toEqual(['title: old → new']);
    });
});
