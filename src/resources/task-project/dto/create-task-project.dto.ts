import { IsInt, IsOptional, IsString, IsDate, IsNumber, IsArray } from 'class-validator';
import { CreateTaskDto } from 'src/resources/tasks/dto/create-task.dto';
import { ProjectPhasesRelationDto } from './projectPhasesRelation.dto';
import { TaskProjectPermissionDto } from './taskProjectPermission.dto';
import { Type } from 'class-transformer';
import { CreateTaskPhaseDto } from '../../task-phase/dto/create-task-phase.dto';

export class CreateTaskProjectDto {

    @IsOptional()
    @IsInt()
        companyId: number | null;

    @IsString()
    @IsOptional()
        name: string | null;

    @IsString()
    @IsOptional()
        logo: string | null;

    @IsString()
    @IsOptional()
        description: string | null;

    @IsString()
    @IsOptional()
        slackChannel: string | null;

    @IsInt()
    @IsOptional()
        isPrivate: number | null;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
        createdAt: Date | null;

    @IsDate()
    @IsOptional()
        deletedAt: Date | null;

    @IsNumber()
    @IsOptional()
        id: number | null;

    @IsArray()
    @IsOptional()
        taskProjectPermissions: TaskProjectPermissionDto[];

    @IsOptional()
        tasks:CreateTaskDto[];

    @IsOptional()
        projectPhasesRelations: ProjectPhasesRelationDto[];

    @IsOptional()
        phases: CreateTaskPhaseDto[]

}
