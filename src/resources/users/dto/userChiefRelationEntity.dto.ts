import { IsNumber, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UserChiefRelationEntityDto {

    @IsNumber()
        id: number;

    @IsOptional()
    @IsNumber()
        userId: number | null;

    @IsOptional()
    @IsNumber()
        chiefId: number | null;

    @IsOptional()
        chief: CreateUserDto;

    @IsOptional()
        user: CreateUserDto;
}