import { DataSource, EntitySubscriberInterface, EventSubscriber, UpdateEvent } from 'typeorm';
import { Logger } from '@nestjs/common';
import { CompanyDaysOffRules } from '../entities/company-days-off-rules.entity';
import { CronsService } from '../../../common/crons/crons.service';
import { CronsType } from '../../../common/crons/crons.enum';

@EventSubscriber()
export class CompanyDaysOffRulesSubscriber implements EntitySubscriberInterface<CompanyDaysOffRules>{
    private readonly logger = new Logger(CompanyDaysOffRulesSubscriber.name);
    constructor (dataSource: DataSource,
                 private cronsService: CronsService
    ) {
        dataSource.subscribers.push(this);
    }
    listenTo () {
        return CompanyDaysOffRules;
    }
    async afterUpdate (event: UpdateEvent<CompanyDaysOffRules>): Promise<void> {
        try {
            const databaseEntity: CompanyDaysOffRules = event.databaseEntity;
            const entity = event.entity;
            if (!databaseEntity || !entity) {
                return;
            }
            const companyId = databaseEntity.companyId;
            const newResetYearly = !!entity.resetYearly;
            const oldResetYearly = !!databaseEntity.resetYearly;
            const newUseScheduler = !!entity.useScheduler;
            const oldUseScheduler = !!databaseEntity.useScheduler;
            const cronTimezone = 'Europe/London';
            // if the use scheduler is changed
            if (newUseScheduler !== oldUseScheduler) {
                const jobName = `company-${companyId}-monthly-scheduler`;
                if (newUseScheduler) {
                    //const jobTime = '*/30 * * * * *'; // for test evey 30 seconds
                    const jobTime = '0 1 1 * *';
                    await this.cronsService.addCron(CronsType.UPDATE_DAYS_OFF_MONTHLY, jobName, jobTime, companyId, cronTimezone);
                } else {
                    // remove cron dynamically
                    await this.cronsService.deleteCron(jobName);
                }
            }
            // if the reset yearly is changed
            if (newResetYearly !== oldResetYearly) {
                const jobName = `company-${companyId}-yearly`;
                if (newResetYearly) {
                    const jobTime = '0 1 1 1 *';
                    await this.cronsService.addCron(CronsType.RESET_DAYS_OFF_YEARLY, jobName, jobTime, companyId, cronTimezone);
                } else {
                    // remove cron dynamically
                    await this.cronsService.deleteCron(jobName);
                }
            }
        } catch (e) {
            this.logger.error(e);
        }
    }
}
