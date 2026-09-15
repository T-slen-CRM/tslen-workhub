import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';

// EMAIL_PORT determines the transport's TLS mode, not just which port to
// dial: 465 is implicit TLS (the client must start the TLS handshake
// immediately - `secure: true`), while 587 (and 25) expect a plaintext
// connection that upgrades via STARTTLS (`secure: false`, nodemailer's
// default). Getting this wrong for 465 doesn't error cleanly - it just
// hangs until the connection times out, since the server is waiting for a
// TLS ClientHello that never comes.
function isImplicitTlsPort (port: number): boolean {
    return port === 465;
}

export function buildMailerConfig (configService: ConfigService) {
    const port = Number(configService.get('EMAIL_PORT')) || 587;
    return {
        transport: {
            host: configService.getOrThrow('EMAIL_HOST'),
            port,
            secure: isImplicitTlsPort(port),
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
    };
}

@Module({
    imports: [
        MailerModule.forRootAsync({
            useFactory: buildMailerConfig,
            inject: [ConfigService],
        })
    ],
    providers: [MailService],
    exports:  [MailService]
})
export class MailModule {}
