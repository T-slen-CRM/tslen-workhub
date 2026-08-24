import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentsModule } from '../../components/components.module';
import { ColDef } from 'ag-grid-community';
import { AuditLogService } from './services/audit-log.service';
import { IAuditLog, IAuditLogRow, IAuditLogUser } from './interfaces/audit-log';
import { flattenAuditLogRows } from './audit-log-row.util';

interface IChipItem {
    group: string;
    value: number | string;
}

@Component({
    selector: 'app-audit-log',
    imports: [CommonModule, ComponentsModule],
    templateUrl: './audit-log.component.html',
})
export class AuditLogComponent implements OnInit {
    private auditLogService = inject(AuditLogService);
    private userNames = new Map<number, string>();

    public userChipData: IChipItem[] = [];
    public resourceChipData: IChipItem[] = [];
    public selectedUserChips: IChipItem[] = [];
    public selectedResourceChips: IChipItem[] = [];

    public rowData = signal<IAuditLogRow[]>([]);

    public columnDefs: ColDef[] = [
        { field: 'createdAt', headerName: 'When', valueFormatter: (params) => params.value ? new Date(params.value).toLocaleString() : '' },
        { field: 'userName', headerName: 'User' },
        { field: 'ip', headerName: 'IP' },
        { field: 'method', headerName: 'Method' },
        { field: 'resourceType', headerName: 'Resource' },
        { field: 'resourceId', headerName: 'Resource ID' },
        { field: 'statusCode', headerName: 'Status' },
        { field: 'field', headerName: 'Field', filter: true, floatingFilter: true },
        { field: 'oldValue', headerName: 'Old Value', filter: true, floatingFilter: true },
        { field: 'newValue', headerName: 'New Value', filter: true, floatingFilter: true },
    ];

    ngOnInit (): void {
        this.auditLogService.getUsers().subscribe({
            next: (users: IAuditLogUser[]) => {
                this.userNames = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));
                this.userChipData = users.map((u) => ({ group: `${u.firstName} ${u.lastName}`, value: u.id }));
                this.refetch();
            },
            error: () => this.refetch(),
        });
    }

    onUserChipsChanged (event: { data: IChipItem[] }): void {
        this.selectedUserChips = event.data;
        this.refetch();
    }

    onResourceChipsChanged (event: { data: IChipItem[] }): void {
        this.selectedResourceChips = event.data;
        this.refetch();
    }

    private refetch (): void {
        const userIds = this.selectedUserChips.map((c) => c.value).filter((v): v is number => typeof v === 'number');
        const resourceTypes = this.selectedResourceChips.map((c) => String(c.value));
        this.auditLogService.getAuditLogs({ userIds, resourceTypes }).subscribe({
            next: (logs: IAuditLog[]) => {
                this.rowData.set(flattenAuditLogRows(logs, this.userNames));
                if (this.resourceChipData.length === 0) {
                    const distinct = Array.from(new Set(logs.map((l) => l.resourceType).filter((r): r is string => !!r)));
                    this.resourceChipData = distinct.map((r) => ({ group: r, value: r }));
                }
            },
            error: () => this.rowData.set([]),
        });
    }
}
