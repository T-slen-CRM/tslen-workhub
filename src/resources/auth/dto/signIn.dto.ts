import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';
import { IUserGooglePermissions } from '../auth.service';

export class SignInDto {
  @IsEmail()
      email: string;

  @IsNotEmpty()
      password: string;

  @IsOptional()
      skipPasswordCheck: boolean;

  @IsOptional()
      googleRefreshToken: string;

  @IsOptional()
      googleAccessToken: string;

  @IsOptional()
      googlePermissions: IUserGooglePermissions
}
