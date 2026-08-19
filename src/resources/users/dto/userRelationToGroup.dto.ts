import { IsNumber, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { CreateUserGroupDto } from 'src/resources/user-group/dto/create-user-group.dto';


export class UserRelationToGroupDto {

    @IsNumber()
        id: number;

    @IsOptional()
    @IsNumber()
        userId: number | null;

    @IsOptional()
        user: CreateUserDto;

    @IsOptional()
        group:CreateUserGroupDto;

    @IsOptional()
    @IsNumber()
        groupId: number;
}