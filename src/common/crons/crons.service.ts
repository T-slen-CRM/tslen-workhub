import { Injectable, Logger } from '@nestjs/common';
import { CronsRepository } from './crons.repository';
import { SchedulerRegistryService } from '../services/scheduler-registry/scheduler-registry.service';
import { CronJob } from 'cron';
import { DaysOffEntity } from '../../resources/company-days-off-rules/entities/days-off.entity';
import { Crons } from './crons.entity';
import { CronsType } from './crons.enum';
import { DaysOffSchedulerEntity } from '../../resources/company-days-off-rules/entities/days-off-scheduler.entity';

@Injectable()
export class CronsService{
    private logger = new Logger(CronsService.name);
    constructor (
    private readonly repository: CronsRepository,
    private schedulerRegistryService: SchedulerRegistryService
    ) {}
    async init (): Promise<void> {
        const crons = await this.repository.find(Crons);
        this.logger.log('CronsService crons', crons);
        crons.forEach(cron => {
            const type = cron.type;
            const name = cron.name;
            const time = cron.time;
            const companyId = cron.companyId;
            const timezone = 'Europe/London';
            this.setCronJobByType(type, name, time, companyId, timezone);
        });
    }
    async saveCronsEntity (name: string, time: string, companyId: number, type: string): Promise<void> {
        const cronsEntity = Object.assign(new Crons({}),{
            name,
            time,
            companyId,
            type
        });
        await this.repository.save(cronsEntity);
    }
    resetDaysOffYearlyCron (time: string, companyId: number, timezone: string): CronJob<null, null> {
        return new CronJob(time, async () => {
            this.logger.warn(`Cron yearly for company ${companyId} is running`);
            const daysOffEntity = Object.assign(new DaysOffEntity({}), {
                hospital: 0,
                vocation: 0,
                timeOff: 0,
                transfer: 0,
                home: 0
            });
            await this.repository.update(DaysOffEntity, { companyId: companyId }, daysOffEntity);
        }
        , null, true, timezone);
    }
    updateDaysOffMonthlyCron (time: string, companyId: number, timezone: string): CronJob<null, null> {
        return new CronJob(time, async () => {

            this.logger.warn(`Cron monthly for company ${companyId} is running`);
            // get all days off scheduler
            const daysOffSchedulerShift: DaysOffSchedulerEntity[] = await this.repository.find(DaysOffSchedulerEntity, { where: { companyId } });
            if (daysOffSchedulerShift.length === 0) {
                return;
            }
            // get all days off
            const daysOffEntity = await this.repository.find(DaysOffEntity, { where: { companyId } });
            if (daysOffEntity.length === 0) {
                return;
            }
            // prepare shifts, example: {hospital: 0, vocation: 0, timeOff: 0, transfer: 0, home: 0}
            const { hospital, vocation, timeOff, transfer, home } = daysOffSchedulerShift.reduce((acc, shift) => {
                acc[shift.requestType] = shift.timeCoefficient;
                return acc;
            }, { hospital: 0, vocation: 0, timeOff: 0, transfer: 0, home: 0 });
            const daysOffEntityShift = daysOffEntity.map((entity) => {
                entity.hospital += hospital;
                entity.vocation += vocation;
                entity.timeOff += timeOff;
                entity.transfer += transfer;
                entity.home += home;
                return entity;
            });
            await this.repository.save(daysOffEntityShift);
        }, null, true, timezone);
    }
    async addCron (type: string, name: string, time: string, companyId: number, timezone: string): Promise<void> {
        try {
            await this.saveCronsEntity(name, time, companyId, type);
            // add cron dynamically
            this.setCronJobByType(type, name, time, companyId, timezone);
        } catch (e) {
            this.logger.error(e);
        }
    }
    async deleteCron (name: string): Promise<void> {
        try {
            const crons = await this.repository.findOne(Crons, { where: { name } });
            if (crons) {
                await this.repository.delete(Crons, { name });
                this.schedulerRegistryService.deleteCron(name);
                this.logger.warn(`Remove cron ${name}`);
            } else {
                this.logger.error(`Cron ${name} not found`);
            }
        } catch (e) {
            this.logger.error(e);
        }
    }
    setCronJobByType (type: string, name: string, time: string, companyId: number, timezone: string): void {
        let job = null;
        if (type === CronsType.RESET_DAYS_OFF_YEARLY) {
            job = this.resetDaysOffYearlyCron(time, companyId, timezone);
        }
        if (type === CronsType.UPDATE_DAYS_OFF_MONTHLY) {
            job = this.updateDaysOffMonthlyCron(time, companyId, timezone);
        }
        if (job) {
            this.schedulerRegistryService.addCronJob(name, job);
            this.logger.warn(`Add cron ${name}`);
        }
    }
}
