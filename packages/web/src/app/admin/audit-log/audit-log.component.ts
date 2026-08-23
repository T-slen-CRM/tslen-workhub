import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentsModule } from '../../components/components.module';
import { ColDef } from 'ag-grid-community';
import { Observable, of } from 'rxjs';
import { catchError, startWith } from 'rxjs/operators';
import { AuditLogService } from './services/audit-log.service';
import { IAuditLog } from './interfaces/audit-log';
import { AuditLogChangesRenderComponent } from '../../tslen-components/ag-grid/audit-log-changes-render/audit-log-changes-render.component';

@Component({
    selector: 'app-audit-log',
    imports: [CommonModule, ComponentsModule],
    templateUrl: './audit-log.component.html',
})
export class AuditLogComponent {
    private auditLogService = inject(AuditLogService);

    public rowData: Observable<IAuditLog[]> = this.auditLogService.getAuditLogs().pipe(
        startWith([] as IAuditLog[]),
        catchError(() => of([])),
    );

    public columnDefs: ColDef[] = [
        { field: 'createdAt', headerName: 'When', valueFormatter: (params) => params.value ? new Date(params.value).toLocaleString() : '' },
        { field: 'userId', headerName: 'User' },
        { field: 'ip', headerName: 'IP' },
        { field: 'method', headerName: 'Method' },
        { field: 'resourceType', headerName: 'Resource' },
        { field: 'resourceId', headerName: 'Resource ID' },
        { field: 'statusCode', headerName: 'Status' },
        { field: 'changes', headerName: 'Changes', cellRenderer: 'auditLogChangesRenderComponent', autoHeight: true, wrapText: true },
    ];

    public components = {
        auditLogChangesRenderComponent: AuditLogChangesRenderComponent,
    };
}
