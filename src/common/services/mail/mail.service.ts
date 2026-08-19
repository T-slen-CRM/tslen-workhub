import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ISendMailOptions } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
    constructor (
      private mailService: MailerService
    ) {}
    async sendMail (options: ISendMailOptions): Promise<string> {
        return await this.mailService.sendMail(options);
    }

}
