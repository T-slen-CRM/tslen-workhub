export type TaskStatus = 'unStatus' | 'inProgress' | 'hold' | 'test' | 'release' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type ProjectPermissionLevel = 'read' | 'write' | 'admin';

export interface Task {
  id: number;
  title: string | null;
  description: string | null;
  assignessEmail: string | null;
  priority: TaskPriority | null;
  status: TaskStatus | null;
  estimate: Date | null;
  createdAt: Date | null;
  createdBy: string | null;
  createdByName: string | null;
  label: string | null;
  updatedAt: Date | null;
  phaseId: number | null;
  projectId: number | null;
  orderId: number | null;
  taskAttachments?: TaskAttachment[];
  taskUserAssignmentRelations?: TaskUserAssignmentRelation[];
}

export interface TaskAttachment {
  id: number;
  taskId: number | null;
  name: string;
  url: string;
  originName: string;
  extension: string | null;
  type: string | null;
}

export interface TaskComment {
  id: number;
  taskId: number | null;
  userId: number | null;
  content: string;
  createdAt: Date;
}

export interface TaskUserAssignmentRelation {
  id: number;
  taskId: number | null;
  userId: number | null;
}

export interface TaskPhase {
  id: number;
  name: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  tasks?: Task[];
}

export interface TaskProject {
  id: number;
  companyId: number | null;
  name: string | null;
  logo: string | null;
  description: string | null;
  slackChannel: string | null;
  // Stored as 0/1 in the DB (an int column, not a boolean one) - see
  // create-task-project.dto.ts's @IsInt().
  isPrivate: number | null;
  createdAt: Date | null;
  deletedAt: Date | null;
  taskProjectPermissions?: TaskProjectPermission[];
  tasks?: Task[];
  phases?: TaskPhase[];
}

export interface TaskProjectPermission {
  id: number;
  projectId: number | null;
  userId: number;
  permission: ProjectPermissionLevel | null;
}

export interface ProjectPhasesRelation {
  id: number;
  projectId: number | null;
  phaseId: number | null;
  orderId: number | null;
}
