interface IAuditFieldChange {
    field: string;
    from?: unknown;
    fromLabel?: string | null;
    to?: unknown;
    toLabel?: string | null;
}

interface IAuditEntityChange {
    entityName: string;
    entityId: number | string;
    action: 'insert' | 'update' | 'delete';
    fields: IAuditFieldChange[];
}

export interface IAuditLog {
    id: number;
    userId: number | null;
    ip: string;
    userAgent: string | null;
    method: string;
    route: string;
    resourceType: string | null;
    resourceId: string | null;
    statusCode: number;
    requestBody: Record<string, unknown> | null;
    changes: IAuditEntityChange[] | null;
    createdAt: string;
}

export interface IAuditLogUser {
    id: number;
    firstName: string;
    lastName: string;
}

export interface IAuditLogRow {
    logId: number;
    createdAt: string;
    userId: number | null;
    userName: string;
    ip: string;
    method: string;
    resourceType: string | null;
    resourceId: string | null;
    statusCode: number;
    entityName: string | null;
    field: string | null;
    oldValue: string | null;
    newValue: string | null;
}
