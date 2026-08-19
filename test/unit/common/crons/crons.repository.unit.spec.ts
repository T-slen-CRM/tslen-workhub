import { CronsRepository } from '../../../../src/common/crons/crons.repository';
import { Test } from '@nestjs/testing/test';

describe('CronsRepository', () => {
    let repository: CronsRepository;
    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
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
        repository = moduleRef.get<CronsRepository>(CronsRepository);
    });
    it('should be defined', () => {
        expect(repository).toBeDefined();
    });
    it('should call find', async () => {
        const entity: any = {};
        const result = await repository.find(entity);
        expect(result).toBeUndefined();
    });
    it('should call save', async () => {
        const entity: any = {};
        const result = await repository.save(entity);
        expect(result).toBeUndefined();
    });
    it('should call update', async () => {
        const entity: any = {};
        const data: any = {};
        const result = await repository.update(entity, {}, data);
        expect(result).toBeUndefined();
    });
});
