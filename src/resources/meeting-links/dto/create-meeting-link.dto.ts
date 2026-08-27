import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateMeetingLinkDto {
    @IsOptional()
    @IsString()
        title?: string;

    @IsOptional()
    @IsDateString()
        expiresAt?: string;
}
