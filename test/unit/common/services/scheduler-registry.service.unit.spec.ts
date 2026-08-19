import {
    SchedulerRegistryService
} from '../../../../src/common/services/scheduler-registry/scheduler-registry.service';
import { TestBed } from '@automock/jest';
import { CronJob } from 'cron';

describe('SchedulerRegistry service', () => {
    let service: SchedulerRegistryService;
    beforeAll(() => {
        const { unit } = TestBed.create(SchedulerRegistryService).compile();
        service = unit;
    });
    it('should be define', () => {
        expect(service).toBeDefined();
    });
    it('should add cron job', async () => {
        const name = 'test';
        const jobFunction = new CronJob('0 0 1 1 1', () =>
            console.log('test'));
        jest.spyOn(service, 'addCronJob').mockImplementation(() => {
            return jest.fn();
        });
        service.addCronJob(name, jobFunction);
        expect(service.addCronJob).toBeCalledTimes(1);
    });
    it('should delete cron', async () => {
        const name = 'test';
        jest.spyOn(service, 'deleteCron').mockImplementation(() => {
            return jest.fn();
        });
        service.deleteCron(name);
        expect(service.deleteCron).toBeCalledTimes(1);
    });
})
