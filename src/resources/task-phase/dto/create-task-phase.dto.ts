import { IsInt, IsOptional, IsString, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderInPhaseDto } from './orderInPhase.dto';
import { CreateTaskDto } from 'src/resources/tasks/dto/create-task.dto';
import { ProjectPhasesRelationDto } from 'src/resources/task-project/dto/projectPhasesRelation.dto';


export class CreateTaskPhaseDto {

    @IsOptional()
    @IsInt()
        id: number;

    @IsOptional()
    @IsString()
        name: string | null;

    @IsOptional()
    @IsDate()
        createdAt: Date | null;

    @IsOptional()
    @IsDate()
        deletedAt: Date | null;

    @IsOptional()
    @IsDate()
        updatedAt: Date | null;

    @IsOptional()
    @Type(() => OrderInPhaseDto)
        orderInPhases: OrderInPhaseDto[] | null;

    @IsOptional()
        tasks:CreateTaskDto[];

    @IsOptional()
        projectPhasesRelations: ProjectPhasesRelationDto[];
}
