// *ngFor in the template below needs CommonModule in scope - it's not
// imported here because this component is declared in TslenComponentsModule
// (standalone: false), which already imports CommonModule for its other
// declarations.
import { Component } from '@angular/core';
import { IAuditEntityChange } from '../../../admin/audit-log/interfaces/audit-log';

export function formatAuditChanges (changes: IAuditEntityChange[] | null): string[] {
    if (!changes || changes.length === 0) {
        return [];
    }
    const lines: string[] = [];
    for (const change of changes) {
        for (const field of change.fields) {
            const from = 'from' in field ? (field.fromLabel ?? formatValue(field.from)) : undefined;
            const to = 'to' in field ? (field.toLabel ?? formatValue(field.to)) : undefined;
            if (from !== undefined && to !== undefined) {
                lines.push(`${field.field}: ${from} → ${to}`);
            } else if (to !== undefined) {
                lines.push(`${field.field}: → ${to}`);
            } else if (from !== undefined) {
                lines.push(`${field.field}: ${from} →`);
            }
        }
    }
    return lines;
}

function formatValue (value: unknown): string {
    if (value === null) {
        return 'none';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}

@Component({
    selector: 'app-audit-log-changes-render',
    template: `<div class="audit-log-changes"><div *ngFor="let line of lines">{{ line }}</div></div>`,
    standalone: false,
})
export class AuditLogChangesRenderComponent {
    public lines: string[] = [];

    agInit (params: { value: IAuditEntityChange[] | null }): void {
        this.lines = formatAuditChanges(params.value);
    }
}
