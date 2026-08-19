import { Injectable, Logger } from '@nestjs/common';
import { CronJob } from 'cron';
import { SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
export class SchedulerRegistryService {
    private logger = new Logger(SchedulerRegistryService.name);
    constructor (
    private schedulerRegistry: SchedulerRegistry
    ) {
    }
    addCronJob (name: string, jobFunction: CronJob): void {
        this.schedulerRegistry.addCronJob(name, jobFunction);
        jobFunction.start();
    }
    deleteCron (name: string) {
        this.schedulerRegistry.deleteCronJob(name);
    }
}
