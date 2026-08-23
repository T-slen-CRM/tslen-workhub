import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataService } from '../../../services/data.service';
import { IAuditLog } from '../interfaces/audit-log';

@Injectable({
    providedIn: 'root'
})
export class AuditLogService {
    private dataService = inject(DataService);

    getAuditLogs (): Observable<IAuditLog[]> {
        return this.dataService.getObservableData('/audit-log');
    }
}
