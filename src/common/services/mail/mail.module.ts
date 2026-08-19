import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';

@Module({
    imports: [
        MailerModule.forRootAsync({
            useFactory: (configService: ConfigService) => ({
                transport: {
                    host: configService.getOrThrow('EMAIL_HOST'),
                    auth: {
                        user: configService.getOrThrow('EMAIL_USERNAME'),
                        pass: configService.getOrThrow('EMAIL_PASSWORD')
                    }
                },
                defaults: {
                    from: configService.getOrThrow('EMAIL_DEFAULT_SENDER')
                },
                template: {
                    dir: join(__dirname, 'templates'),
                    adapter: new HandlebarsAdapter(),
                    options: {
                        strict: true,
                    },
                },
            }),
            inject: [ConfigService],
        })
    ],
    providers: [MailService],
    exports:  [MailService]
})
export class MailModule {}
