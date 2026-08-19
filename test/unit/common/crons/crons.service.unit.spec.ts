import { CronsService } from '../../../../src/common/crons/crons.service';
import { Test } from '@nestjs/testing/test';
import { CronsRepository } from '../../../../src/common/crons/crons.repository';
import { CronJob } from 'cron';
describe('CronsService', () => {
    let service: CronsService;
    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                {
                    provide: CronsService,
                    useValue: {
                        init: jest.fn(),
                        saveCronsEntity: jest.fn(),
                        setCronJobByType: jest.fn(),
                        deleteCron: jest.fn(),
                        addCron: jest.fn(),
                        updateDaysOffMonthlyCron: jest.fn(),
                        resetDaysOffYearlyCron: jest.fn(),
                    },
                },
                {
                    provide: CronsRepository,
                    useValue: {
                        find: jest.fn(),
                        save: jest.fn(),
                        update: jest.fn(),
                    },
                }
            ],
        }).compile();
        service = moduleRef.get<CronsService>(CronsService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should call addCron', async () => {
        const result = await service.addCron('type', 'name', 'time', 1, 'timezone');
        expect(result).toBeUndefined();
    });
    it('should call deleteCron', async () => {
        const result = await service.deleteCron('name');
        expect(result).toBeUndefined();
    });
    it('should call init', () => {
        expect(service.init).toBeDefined();
    });
    it('should call saveCronsEntity', async () => {
        const result = await service.saveCronsEntity('name', 'time', 1, 'type');
        expect(result).toBeUndefined();
    });
    // TODO: fix it
    // it('should call setCronJobByType', async () => {
    //     service.setCronJobByType('type', 'name', 'time', 1, 'timezone');
    //     expect(result).toBeUndefined();
    // });
    it('should call resetDaysOffYearlyCron', () => {
        const job = new CronJob('* * * * *', () => console.log('test cron'));
        jest.spyOn(service, 'resetDaysOffYearlyCron').mockReturnValue(job);
        const result = service.resetDaysOffYearlyCron('time', 1, 'timezone');
        expect(result).toBe(job);
    });
    it('should call updateDaysOffMonthlyCron', () => {
        const job = new CronJob('* * * * *', () => console.log('test cron'));
        jest.spyOn(service, 'updateDaysOffMonthlyCron').mockReturnValue(job);
        const result = service.updateDaysOffMonthlyCron('time', 1, 'timezone');
        expect(result).toBe(job);
    });
});
