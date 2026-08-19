
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing/test';
import { CompanySubscriber } from '../../../../src/resources/company/subscribers/company.subscriber';
import { Company } from '../../../../src/resources/company/entities/company.entity';

describe('Company Unit Test', () => {
    let subscriber: CompanySubscriber;
    // datasource is a mock
    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                CompanySubscriber,
                {
                    provide: DataSource,
                    useValue: { subscribers: [] },
                },
            ],
        }).compile();
        subscriber = moduleRef.get<CompanySubscriber>(CompanySubscriber);
    });
    it('should be defined', () => {
        expect(subscriber).toBeDefined();
    });
    it('should listen to Company', () => {
        expect(subscriber.listenTo()).toBe(Company);
    });
})
