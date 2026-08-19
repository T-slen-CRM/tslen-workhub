import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsInt, IsBoolean, IsDate, IsNotEmpty, IsNumber, IsDateString, IsArray } from 'class-validator';
import { CreateUserDto } from '../../users/dto/create-user.dto';

export class CreateEventsByUserDto {

    @Transform(({ value }) => Number(value))
    @IsNumber()
        id: number;

    @IsOptional()
        user: CreateUserDto;

    @IsOptional()
    @IsArray()
        attendees: any[];

    @IsOptional()
    @IsString()
        googleTimezone?: string;

    @IsOptional()
    @IsInt()
        userId: number | null;

    @IsOptional()
    @IsString()
        title: string | null;

    @IsNotEmpty()
    @IsDateString()
        start: Date;

    @IsNotEmpty()
    @IsDateString()
        end: Date;

    @IsOptional()
    @IsString()
        primaryColor: string | null;

    @IsOptional()
    @IsString()
        secondaryColor: string | null;

    @IsInt()
        approved: number;

    @IsOptional()
    @IsString()
        comment: string;

    @IsOptional()
    @IsString()
        requestType: string;

    @IsOptional()
    @IsNumber()
        timeOffset: number;

    @IsOptional()
    @IsString()
        googleId: string;

    @IsOptional()
    @IsString()
        googleMeetLink: string;

    @IsOptional()
    @IsString()
        googleCalendarId: string | null;

    @IsOptional()
    @IsString()
        secretToken: string;

    @Transform(({ value }) => !!value)
    @IsBoolean()
        isRequest: boolean;

    @IsOptional()
    @Transform(({ value }) => !!value)
    @IsBoolean()
        isGoogleEvent: boolean;

    @Transform(({ value }) => (value ? new Date(value) : null))
    @IsDate()
        createdAt: Date | null;
}
