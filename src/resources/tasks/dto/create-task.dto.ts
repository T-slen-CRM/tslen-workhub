import { IsOptional, IsInt, IsString, IsIn, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTaskPhaseDto } from '../../task-phase/dto/create-task-phase.dto';
import { CreateTaskProjectDto } from '../../task-project/dto/create-task-project.dto';
import { OrderInPhaseDto } from '../../task-phase/dto/orderInPhase.dto';
import { TaskAttachmentsDto } from './taskAttachments.dto';
import { TaskUserAssignmentDto } from './taskUserAssignment.dto';
import { TaskPriority, TaskStatus } from '@tslen-workhub/shared';


export class CreateTaskDto {
    @IsOptional()
    @IsInt()
        id: number;

    @IsOptional()
    @IsString()
        title: string | null;

    @IsOptional()
    @IsString()
        description: string | null;

    @IsOptional()
    @IsString()
        assignessEmail: string | null;

    // Not @IsOptional(): tasks.priority is NOT NULL in Postgres (see
    // task.entity.ts), so omitting it always fails - either here with a
    // clear message, or downstream as a DB constraint violation.
    @IsIn(['low', 'medium', 'high'])
        priority: TaskPriority;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
        estimate: Date | null;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
        createdAt: Date | null;

    @IsOptional()
    @IsString()
        createdBy: string | null;

    @IsOptional()
    @IsString()
        createdByName: string | null;

    @IsOptional()
    @IsString()
        label: string | null;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
        updatedAt: Date | null;

    @IsOptional()
    @IsInt()
        phaseId: number | null;

    @IsOptional()
    @IsInt()
        projectId: number | null;

    @IsOptional()
    @IsInt()
        orderId: number | null;

    @IsOptional()
    @IsInt()
        actorUserId: number | null;

    @IsOptional()
    @IsIn(['unStatus', 'inProgress', 'hold', 'test', 'release', 'done'])
        status: TaskStatus | null;

    @IsOptional()
        phases: CreateTaskPhaseDto;

    @IsOptional()
        project: CreateTaskProjectDto;

    @IsOptional()
        taskAttachments: TaskAttachmentsDto[];

    @IsOptional()
        orderInPhases: OrderInPhaseDto;

    @IsOptional()
        taskUserAssignmentRelations: TaskUserAssignmentDto[];
}
