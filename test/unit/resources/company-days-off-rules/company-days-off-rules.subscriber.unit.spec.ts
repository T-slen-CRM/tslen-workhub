import {
    CompanyDaysOffRulesSubscriber
} from '../../../../src/resources/company-days-off-rules/subscribers/company-days-off-rules.subscriber';
import { DataSource, UpdateEvent } from 'typeorm';
import {
    CompanyDaysOffRules
} from '../../../../src/resources/company-days-off-rules/entities/company-days-off-rules.entity';
import { Company } from '../../../../src/resources/company/entities/company.entity';
import { Test } from '@nestjs/testing/test';
import { CronsService } from '../../../../src/common/crons/crons.service';

describe('CompanyDaysOffRulesSubscriber', () => {
    let subscriber: CompanyDaysOffRulesSubscriber;
    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                CompanyDaysOffRulesSubscriber,
                {
                    provide: DataSource,
                    useValue: { subscribers: [] },
                },
                {
                    provide: CronsService,
                    useValue: { addCron: jest.fn(), deleteCron: jest.fn() }
                }
            ],
        }).compile();
        subscriber = moduleRef.get<CompanyDaysOffRulesSubscriber>(CompanyDaysOffRulesSubscriber);
    });
    it('should be defined', () => {
        expect(subscriber).toBeDefined();
    });
    it('should listen to EventsByUser', () => {
        expect(subscriber.listenTo()).toBe(CompanyDaysOffRules);
    });
    it('should call afterUpdate',
        async () => {
            const event: UpdateEvent<CompanyDaysOffRules> = {
                databaseEntity: {
                    id: 1,
                    companyId: 1,
                    hospital: 1,
                    timeOff: 1,
                    vocation: 1,
                    transfer: 1,
                    home: 1,
                    resetYearly: 1,
                    useScheduler: 1,
                    company: {} as Company
                },
                entity: {
                    companyId: 1,
                    resetYearly: true,
                    useScheduler: true,
                },
                connection: {} as any,
                metadata: {} as any,
                queryRunner: {} as any,
                manager: {} as any,
                updatedRelations: [],
                updatedColumns: []
            };
            jest.spyOn(subscriber, 'afterUpdate').mockImplementation(() => {
                return Promise.resolve();
            });
            const result = await subscriber.afterUpdate(event);
            expect(result).toBeUndefined();

        });

});
