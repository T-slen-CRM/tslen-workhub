import { IsOptional, IsInt, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTaskPhaseDto } from '../../task-phase/dto/create-task-phase.dto';
import { CreateTaskProjectDto } from './create-task-project.dto';

export class ProjectPhasesRelationDto {

    @IsNumber()
        id: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
        projectId: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
        phaseId: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
        orderId: number;

    @IsOptional()
        phase: CreateTaskPhaseDto;

    @IsOptional()
        project: CreateTaskProjectDto;
}
