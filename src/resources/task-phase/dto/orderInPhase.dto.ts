import { IsInt, IsOptional } from 'class-validator';
import { CreateTaskDto } from '../../tasks/dto/create-task.dto';
import { CreateTaskPhaseDto } from './create-task-phase.dto';

export class OrderInPhaseDto {
    @IsInt()
        id: number;

    @IsOptional()
    @IsInt()
        phaseId: number | null;

    @IsOptional()
    @IsInt()
        taskId: number | null;

    @IsOptional()
    @IsInt()
        orderId: number | null;

    @IsOptional()
        phases: CreateTaskPhaseDto;

    @IsOptional()
        task: CreateTaskDto;

}