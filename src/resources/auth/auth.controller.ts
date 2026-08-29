import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Redirect,
    Query
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/signIn.dto';
import { SkipAuth } from './decorators/public.guard';
import { SignInResponseDto } from './dto/signIn.response.dto';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';
import { Roles } from '../../common/guards/roles/roles.decorator';
import { Role } from '@tslen-workhub/shared';

@Controller('auth')
export class AuthController {
    constructor (
      private authService: AuthService,
    ) {}
  @SkipAuth()
  @HttpCode(HttpStatus.OK)
  @Post('login')
    signIn (@Body() signInDto: SignInDto): Promise<SignInResponseDto> {
        return this.authService.signInWithPassword(signInDto.email, signInDto.password);
    }

  @Get('session-data')
  getSessionData (@User() user: Users) {
      return user;
  }
  @Get('logout')
  @HttpCode(HttpStatus.OK)
  logout () {
      return {};
  }
 @Roles(Role.Admin, Role.Manager)
  @Get('change-user/:id')
  async changeUser (
      @User() user: Users,
      @Param('id', ParseIntPipe) id: number
  ): Promise<{ user: Users; accessToken: string }> {
      return await this.authService.changeUser(id, user);
  }
  @SkipAuth()
  @Get('google-auth')
  @Redirect()
 async googleAuth (): Promise<{ url: string}> {
     return await this.authService.googleAuth();
 }
  @SkipAuth()
  @Get('google-callback')
  @Redirect()
  async googleAuthCallback (@Query('code') code: string, @Query('scope') scope: string): Promise<{ url: string}> {
      const googlePermissions = await this.authService.getGooglePermissions(scope);

      const { email, refreshToken, accessToken } = await this.authService.getAuthClientData(code);
      const jwtToken: SignInResponseDto = await this.authService.signInWithGoogle(
          email,
          accessToken,
          refreshToken,
          googlePermissions
      );
      // set header authorization
      if (jwtToken.accessToken){
          return { url: process.env.REDIRECT_TO_LOGIN + '?token=' + jwtToken.accessToken };
      } else {
          return;
      }
  }

}
