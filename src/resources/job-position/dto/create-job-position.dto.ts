import { IsInt, IsOptional, IsString } from 'class-validator';
import { CreateUserDto } from '../../users/dto/create-user.dto';

export class CreateJobPositionDto {

    @IsOptional()
    @IsInt()
        id: number;

    @IsString()
        title: string;

    @IsOptional()
        users: CreateUserDto[];

}
