import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataService } from '../../../services/data.service';
import { IAuditLog, IAuditLogUser } from '../interfaces/audit-log';

export interface IAuditLogFilters {
    userIds?: number[];
    resourceTypes?: string[];
}

export function buildAuditLogQuery (filters: IAuditLogFilters): string {
    const params = new URLSearchParams();
    if (filters.userIds && filters.userIds.length > 0) {
        params.set('userIds', filters.userIds.join(','));
    }
    if (filters.resourceTypes && filters.resourceTypes.length > 0) {
        params.set('resourceTypes', filters.resourceTypes.join(','));
    }
    const query = params.toString();
    return query ? `?${query}` : '';
}

@Injectable({
    providedIn: 'root'
})
export class AuditLogService {
    private dataService = inject(DataService);

    getAuditLogs (filters: IAuditLogFilters = {}): Observable<IAuditLog[]> {
        return this.dataService.getObservableData('/audit-log' + buildAuditLogQuery(filters));
    }

    getUsers (): Observable<IAuditLogUser[]> {
        return this.dataService.getObservableData('/users');
    }
}
