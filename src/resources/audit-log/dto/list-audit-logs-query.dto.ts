import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class ListAuditLogsQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
        userId?: number;

    @IsOptional()
    @IsString()
        resourceType?: string;
}
