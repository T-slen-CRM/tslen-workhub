import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateExternalTaskDto {
    @IsString()
    @IsNotEmpty()
        title: string;

    @IsOptional()
    @IsString()
        description?: string;

    @IsInt()
        phaseId: number;

    @IsOptional()
    @IsString()
        priority?: string;

    @IsOptional()
    @IsString()
        assigneeEmail?: string;
}
