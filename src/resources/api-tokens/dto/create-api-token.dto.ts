import { IsNotEmpty, IsString } from 'class-validator';

export class CreateApiTokenDto {
    @IsString()
    @IsNotEmpty()
        name: string;
}
