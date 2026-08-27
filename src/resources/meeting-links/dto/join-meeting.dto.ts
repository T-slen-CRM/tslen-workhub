import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class JoinMeetingDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
        displayName: string;
}
