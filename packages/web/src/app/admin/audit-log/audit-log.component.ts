import {
  Component,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';

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
  imports: [ComponentsModule],
  templateUrl: './audit-log.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./audit-log.component.scss'],
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
    {
      field: 'createdAt',
      headerName: 'When',
      sortable: true,
      filter: true,
      valueFormatter: (params) =>
        params.value ? new Date(params.value).toLocaleString() : '',
    },
    { field: 'userName', headerName: 'User', sortable: true, filter: true },
    { field: 'ip', headerName: 'IP', sortable: true, filter: true },
    { field: 'method', headerName: 'Method', sortable: true, filter: true },
    {
      field: 'resourceType',
      headerName: 'Resource',
      sortable: true,
      filter: true,
    },
    {
      field: 'resourceId',
      headerName: 'Resource ID',
      sortable: true,
      filter: true,
    },
    { field: 'statusCode', headerName: 'Status', sortable: true, filter: true },
    { field: 'field', headerName: 'Field', sortable: true, filter: true },
    {
      field: 'oldValue',
      headerName: 'Old Value',
      sortable: true,
      filter: true,
    },
    {
      field: 'newValue',
      headerName: 'New Value',
      sortable: true,
      filter: true,
    },
  ];

  ngOnInit(): void {
    this.auditLogService.getUsers().subscribe({
      next: (users: IAuditLogUser[]) => {
        this.userNames = new Map(
          users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]),
        );
        this.userChipData = users.map((u) => ({
          group: `${u.firstName} ${u.lastName}`,
          value: u.id,
        }));
        this.refetch();
      },
      error: () => this.refetch(),
    });
  }

  onUserChipsChanged(event: { data: IChipItem[] }): void {
    this.selectedUserChips = event.data;
    this.refetch();
  }

  onResourceChipsChanged(event: { data: IChipItem[] }): void {
    this.selectedResourceChips = event.data;
    this.refetch();
  }

  private refetch(): void {
    const userIds = this.selectedUserChips
      .map((c) => c.value)
      .filter((v): v is number => typeof v === 'number');
    const resourceTypes = this.selectedResourceChips.map((c) =>
      String(c.value),
    );
    this.auditLogService.getAuditLogs({ userIds, resourceTypes }).subscribe({
      next: (logs: IAuditLog[]) => {
        this.rowData.set(flattenAuditLogRows(logs, this.userNames));
        if (this.resourceChipData.length === 0) {
          const distinct = Array.from(
            new Set(
              logs.map((l) => l.resourceType).filter((r): r is string => !!r),
            ),
          );
          this.resourceChipData = distinct.map((r) => ({ group: r, value: r }));
        }
      },
      error: () => this.rowData.set([]),
    });
  }
}
