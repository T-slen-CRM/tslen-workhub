import {TaskAttachment, TaskPriority, TaskStatus, TaskUserAssignmentRelation} from "@tslen-workhub/shared";
import {IProjectPermission} from "./taskProjectPermission";

export interface ITaskProject {
    id: number;
    companyId: number;
    name: string;
    // Stored as 0/1 (an int column, not a boolean one) - see
    // packages/shared/src/task.ts's TaskProject.isPrivate.
    isPrivate: number;
    logo?: string;
    members?: string;
    permission?: string;
    createdAt: string | Date;
    deletedAt?: string | Date;
    description?: string;
    taskProjectPermissions: IProjectPermission[];
    tasks?: ITask[];
    phases?: ITaskPhase[];
    projectPhasesRelations?: IProjectPhasesRelations[];
}
export interface ITaskPhase {
    id: number;
    name: string;
    slackChannel?: string;
    data?: ITask[];
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    tasks?: ITask[];
    projectPhasesRelations?: IProjectPhasesRelations[];
}
export interface ITask{
    id: number;
    title: string;
    assignessEmail: string;
    createdBy: string;
    description: string;
    estimate: Date;
    label: string;
    taskAttachments?: TaskAttachment[] | null;
    phaseId: number;
    projectId: number;
    actorUserId?: number;
    phaseName?: string;
    projectName?: string;
    status?: TaskStatus;
    createdAt?: Date;
    updatedAt?: Date;
    orderId: number;
    users?: any[];
    avatar?: string;
    tooltipCreate?: string;
    tooltipUpdate?: string;
    viewDateCreate?: string;
    viewDateUpdate?: string;
    estimateUntilDay?: string;
    estimateViewDate?: string;
    estimateColor?: string;
    url?: string;
    taskUserAssignmentRelations?: TaskUserAssignmentRelation[];
    previousTaskAttachments?: TaskAttachment[];
    priority?: TaskPriority;
}
export interface ITaskList {
    id: number;
    name: string;
    data?: ITask[];
    tasks?: ITask[];
}
export interface IProjectPhasesRelations {
    id?: number;
    projectId: number;
    phaseId?: number;
    orderId: number;
    phase?: ITaskPhase;
    project?: ITaskProject;
}
 export interface ITextEditor {
    minHeight: string;
    showToolbar: boolean;
    placeholder: string;
    toolbarHiddenButtons: [string[], string[]];
}
export interface ITaskComment {
    id: number;
    taskId: number;
    content: string;
    createdAt: string;
    user: {
        id: number;
        firstName: string;
        lastName: string;
    };
}
export interface ITaskHistoryEntry {
    id: string;
    createdAt: string;
    action: 'insert' | 'update' | 'delete';
    field: string;
    from: unknown;
    fromLabel: string | null;
    to: unknown;
    toLabel: string | null;
    user: {
        id: number;
        firstName: string;
        lastName: string;
    } | null;
}
