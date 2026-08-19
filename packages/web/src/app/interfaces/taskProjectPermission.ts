export interface IPermissionTableColumn {
    field: string;
    headerName: string;
    permission: string[];
    component?: any;
}
export interface IProjectPermission {
    id?: number | null;
    permission: string;
    projectId?: number;
    userId: number;
    userName?: string;
    unsavedId?: number;
    user?: any;
}
