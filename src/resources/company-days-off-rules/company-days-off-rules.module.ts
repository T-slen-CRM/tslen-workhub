import { Module } from '@nestjs/common';
import { CompanyDaysOffRulesService } from './company-days-off-rules.service';
import { CompanyDaysOffRulesController } from './company-days-off-rules.controller';
import { CompanyDaysOffRulesRepository } from './company-days-off-rules.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyDaysOffRules } from './entities/company-days-off-rules.entity';
import { CompanyDaysOffRulesSubscriber } from './subscribers/company-days-off-rules.subscriber';
import { CronsService } from '../../common/crons/crons.service';
import { SchedulerRegistryService } from '../../common/services/scheduler-registry/scheduler-registry.service';
import { CronsModule } from '../../common/crons/crons.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([CompanyDaysOffRules]),
        CronsModule
    ],
    controllers: [CompanyDaysOffRulesController],
    providers: [
        CompanyDaysOffRulesService,
        CompanyDaysOffRulesRepository,
        CompanyDaysOffRulesSubscriber,
        CronsService,
        SchedulerRegistryService
    ],
    exports: [
        CompanyDaysOffRulesService,
        CompanyDaysOffRulesRepository
    ]
})
export class CompanyDaysOffRulesModule {}
