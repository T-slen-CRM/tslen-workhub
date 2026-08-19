import {
    IsString,
    IsOptional,
    IsInt,
    IsDateString,
    IsNumber,
    IsArray,
    IsNotEmpty,
} from 'class-validator';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { CreateInventoryByUserHistoryDto } from './create-inventory-by-user-history.dto';
export class CreateInventoryDto {
    @IsNumber()
    @IsOptional()
        id: number | null;
   @IsString()
   @IsNotEmpty()
       name: string;
   @IsInt()
   @IsOptional()
       userId: number | null;
    @IsString()
    @IsOptional()
        description: string | null;
    @IsString()
    @IsOptional()
        serialNumber: string | null;
    @IsString()
    @IsOptional()
    @IsNotEmpty()
        category: string | null;
    @IsString()
    @IsOptional()
        location: string | null;
    @IsString()
    @IsOptional()
        department: string | null;
    @IsString()
    @IsOptional()
        subDivision: string | null;
    @IsString()
    @IsOptional()
        price: string | null;
    @IsDateString()
    @IsOptional()
        warrantyDate: string | null;
    @IsString()
    @IsOptional()
    @IsNotEmpty()
        code: string | null;
    @IsArray()
    @IsOptional()
        inventoryByUserHistory: CreateInventoryByUserHistoryDto[];
    @IsOptional()
        user: CreateUserDto;



}
