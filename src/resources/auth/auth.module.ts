import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';
import { SlackService } from '../../common/services/slack/slack.service';
import { ErrorService } from '../../common/services/error/error.service';
import { RolesGuard } from '../../common/guards/roles/roles.guard';
import { MailService } from '../../common/services/mail/mail.service';
import { GoogleService } from '../../common/services/google/google.service';

@Module({
    imports: [
        UsersModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                global: true,
                secret: configService.get('JWT_SECRET'),
                signOptions: { expiresIn: '240h' },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        AuthGuard,
        { provide: APP_GUARD, useExisting: AuthGuard },
        {
            provide: APP_GUARD,
            useClass: RolesGuard,
        },
        SlackService,
        ErrorService,
        MailService,
        GoogleService,
    ],
})
export class AuthModule {}
