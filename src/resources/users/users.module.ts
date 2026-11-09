import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from './entities/users.entity';
import { UserRelationToGroup } from './entities/user-relation-to-group.entity';
import { CompanyDaysOffRules } from '../company-days-off-rules/entities/company-days-off-rules.entity';
import { DaysOffSchedulerEntity } from '../company-days-off-rules/entities/days-off-scheduler.entity';
import { DaysOffEntity } from '../company-days-off-rules/entities/days-off.entity';
import { UserChiefRelationEntity } from './entities/user-chief-relation.entity';
import { UserProbationEntity } from './entities/user-probation.entity';
import { UsersRepository } from './users.repository';
import { JwtService } from '@nestjs/jwt';
import { SlackService } from '../../common/services/slack/slack.service';
import { UserGroup } from '../user-group/entities/user-group.entity';
import { JobPosition } from '../job-position/entities/job-position.entity';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageModule } from '../../common/services/storage/storage.module';
import { ErrorService } from '../../common/services/error/error.service';
import { UserGooglePermission } from './entities/user-google-permission.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryByUserHistory } from '../inventory/entities/inventory-by-user-history.entity';
@Module({

    imports: [
        TypeOrmModule.forFeature([
            Users,
            UserRelationToGroup,
            UserGroup,
            CompanyDaysOffRules,
            DaysOffSchedulerEntity,
            DaysOffEntity,
            UserChiefRelationEntity,
            UserProbationEntity,
            JobPosition,
            UserGooglePermission,
            Inventory,
            InventoryByUserHistory
        ]
        ),
        MulterModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                dest: './' + configService.get<string>('MULTER_DEST'),
            }),
            inject: [ConfigService],
        }),
        StorageModule
    ],
    controllers: [UsersController],
    providers: [
        UsersService,
        UsersRepository,
        JwtService,
        ErrorService,
        SlackService
    ],
    exports: [UsersService, UsersRepository]
})
export class UsersModule {}
