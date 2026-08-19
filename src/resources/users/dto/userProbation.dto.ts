import { IsBoolean, IsDateString,IsInt, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UserProbationDto {
    @IsOptional()
    @IsInt()
        id: number;

    @IsOptional()
    @IsInt()
        userId: number | null;

    @IsOptional()
    @IsDateString()
        start: string | null;

    @IsOptional()
    @IsDateString()
        end: string | null;

    @IsOptional()
    @IsBoolean()
        isProbation: boolean | null;

    @IsOptional()
        user: CreateUserDto
}