import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

function toArray (value: unknown): string[] {
    if (Array.isArray(value)) {
        return value;
    }
    return String(value).split(',').map((v) => v.trim()).filter((v) => v.length > 0);
}

export class ListAuditLogsQueryDto {
    @IsOptional()
    @Transform(({ value }) => toArray(value).map(Number))
    @IsInt({ each: true })
        userIds?: number[];

    @IsOptional()
    @Transform(({ value }) => toArray(value))
    @IsString({ each: true })
        resourceTypes?: string[];
}
