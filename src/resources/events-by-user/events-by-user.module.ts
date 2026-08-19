import { Module } from '@nestjs/common';
import { EventsByUserService } from './events-by-user.service';
import { EventsByUserController } from './events-by-user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsByUser } from './entities/events-by-user.entity';
import { ErrorService } from '../../common/services/error/error.service';
import { EventsByUserRepository } from './events-by-user.repository';
import { SlackService } from '../../common/services/slack/slack.service';
import { Users } from '../users/entities/users.entity';
import { DaysOffEntity } from '../company-days-off-rules/entities/days-off.entity';
import { PermissionGuard } from '../../common/guards/permissioon/permission.guard';
import { APP_GUARD } from '@nestjs/core';
import { EventsByUserSubscriber } from './subscribers/events-by-user.subscriber';
import { GoogleService } from '../../common/services/google/google.service';
import { GoogleModule } from '../../common/services/google/google.module';
import { MailService } from '../../common/services/mail/mail.service';
import { CryptoService } from '../../common/services/crypto/crypto.service';
import { EventAttendees } from './entities/event-attendees.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            EventsByUser,
            Users,
            DaysOffEntity,
            EventAttendees
        ]),
        GoogleModule
    ],
    controllers: [EventsByUserController],
    providers: [
        EventsByUserService,
        ErrorService,
        EventsByUserRepository,
        SlackService,
        {
            provide: APP_GUARD,
            useClass: PermissionGuard,
        },
        EventsByUserSubscriber,
        {
            provide: 'GoogleService',
            useExisting: GoogleService
        },
        MailService,
        CryptoService
    ],
})
export class EventsByUserModule {}
