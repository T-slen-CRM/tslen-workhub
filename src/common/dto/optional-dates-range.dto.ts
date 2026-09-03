import { IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class OptionalDatesRangeDto {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
      startDate?: Date;
  @IsOptional()
  @IsDate()
  @Type(() => Date)
      endDate?: Date;
}
