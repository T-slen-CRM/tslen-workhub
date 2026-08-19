import { BadRequestException } from '@nestjs/common';

export function toSqlSafeInteger (value: number, fieldName: string): number {
    if (!Number.isInteger(value)) {
        throw new BadRequestException(`Invalid ${fieldName}`);
    }
    return value;
}
