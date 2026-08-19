import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class ListExternalTasksQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
        projectId?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
        phaseId?: number;

    @IsOptional()
    @IsString()
        status?: string;
}
