import { IsOptional, IsInt, IsDateString } from 'class-validator';



export class CreateInventoryByUserHistoryDto {
  @IsInt()
  @IsOptional()
      id?: number;

  @IsInt()
      inventoryId: number;

  @IsInt()
      userId: number;

  @IsDateString()
      startDate: string;

  @IsDateString()
  @IsOptional()
      endDate?: string;
}
