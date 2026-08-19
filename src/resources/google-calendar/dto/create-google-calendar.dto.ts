import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { CreateUserDto } from '../../users/dto/create-user.dto';

export class CreateGoogleCalendarDto {

    @IsNumber()
        id: number;

    @IsOptional()
    @IsInt()
        userId: number | null;

    @IsString()
        calendarId: string;

    @IsOptional()
    @IsString()
        timezone: string | null;

    @IsOptional()
        user: CreateUserDto;

}
