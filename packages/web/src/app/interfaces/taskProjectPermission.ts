import {ProjectPermissionLevel} from "@tslen-workhub/shared";

export interface IPermissionTableColumn {
    field: string;
    headerName: string;
    permission: string[];
    component?: any;
}
export interface IProjectPermission {
    id?: number | null;
    permission: ProjectPermissionLevel;
    projectId?: number;
    userId: number;
    userName?: string;
    unsavedId?: number;
    user?: any;
}
