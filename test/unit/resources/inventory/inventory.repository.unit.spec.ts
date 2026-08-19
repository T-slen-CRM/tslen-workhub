import { Repository } from 'typeorm';
import { InventoryRepository } from '../../../../src/resources/inventory/inventory.repository';
import { Inventory } from '../../../../src/resources/inventory/entities/inventory.entity';
import { InventoryByUserHistory } from '../../../../src/resources/inventory/entities/inventory-by-user-history.entity';
import { CreateInventoryDto } from '../../../../src/resources/inventory/dto/create-inventory.dto';
import { UpdateInventoryDto } from '../../../../src/resources/inventory/dto/update-inventory.dto';

const makeInventoryEntity = (p: Partial<Inventory> = {}): Inventory =>
    Object.assign(new Inventory(), {
        id: 1,
        name: 'Laptop',
        userId: 10,
        description: 'Test item',
        serialNumber: 'SN-0001',
        category: 'OTHER',
        location: 'HQ',
        department: 'IT',
        subDivision: 'Team A',
        price: '1000',
        warrantyDate: '2030-01-01',
        code: 'INV-0001',
        inventoryByUserHistory: [],
        user: null,
        ...p,
    });

const makeCreateDto = (p: Partial<CreateInventoryDto> = {}): CreateInventoryDto => ({
    id: null,
    name: 'MacBook',
    userId: 5,
    description: 'x',
    serialNumber: 'SN',
    category: 'IT',
    location: 'HQ',
    department: 'IT',
    subDivision: 'Dev',
    price: '1',
    warrantyDate: '2030-01-01',
    code: 'INV',
    inventoryByUserHistory: [],
    user: null,
    ...p,
});

const makeUpdateDto = (p: Partial<UpdateInventoryDto> = {}): UpdateInventoryDto => ({
    userId: 11,
    ...p,
});

function createRepoMock<T> (): jest.Mocked<Repository<T>> {
    return {
        find: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn(),
        insert: jest.fn(),
        createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<T>>;
}

describe('InventoryRepository (unit) — current simplified version', () => {
    let inventoryRepoORM: jest.Mocked<Repository<Inventory>>;
    let historyRepoORM: jest.Mocked<Repository<InventoryByUserHistory>>;
    const entityManager: unknown = {};
    let repo: InventoryRepository;

    beforeEach(() => {
        inventoryRepoORM = createRepoMock<Inventory>();
        historyRepoORM = createRepoMock<InventoryByUserHistory>();

        repo = new InventoryRepository(
            inventoryRepoORM,
            historyRepoORM,
          entityManager as any,
        );
    });

    afterEach(() => jest.clearAllMocks());

    describe('createOneWithHistory', () => {
        it('calls inventoryRepository.save(dto) and returns saved entity', async () => {
            const dto = makeCreateDto({ name: 'MacBook', userId: 5 });
            const saved = makeInventoryEntity({ id: 100, name: dto.name, userId: dto.userId });

            inventoryRepoORM.save.mockResolvedValue(saved);

            const result = await repo.createOneWithHistory(dto);

            expect(inventoryRepoORM.save).toHaveBeenCalledTimes(1);
            expect(inventoryRepoORM.save).toHaveBeenCalledWith(dto);
            expect(result).toStrictEqual(saved);
        });
    });

    describe('findAllInventory', () => {
        it('calls inventoryRepository.find() with no options', async () => {
            const list = [makeInventoryEntity({ id: 1 }), makeInventoryEntity({ id: 2 })];
            inventoryRepoORM.find.mockResolvedValue(list);

            const res = await repo.findAllInventory();

            expect(inventoryRepoORM.find).toHaveBeenCalledTimes(1);
            expect(inventoryRepoORM.find).toHaveBeenCalledWith();
            expect(res).toStrictEqual(list);
        });
    });

    describe('getOneWithHistory', () => {
        it('calls inventoryRepository.findOne({ where: { id } }) without relations', async () => {
            const item = makeInventoryEntity({ id: 7 });
            inventoryRepoORM.findOne.mockResolvedValue(item);

            const res = await repo.getOneWithHistory(7);

            expect(inventoryRepoORM.findOne).toHaveBeenCalledTimes(1);
            expect(inventoryRepoORM.findOne).toHaveBeenCalledWith({ where: { id: 7 } });
            expect(res).toStrictEqual(item);
        });
    });

    describe('updateOneWithHistory', () => {
        it('calls inventoryRepository.save({ id, ...dto }) and returns saved entity', async () => {
            const dto = makeUpdateDto({ userId: 11 });
            const expectedPayload = { id: 5, ...dto };
            const saved = makeInventoryEntity({ id: 5, userId: 11 });

            inventoryRepoORM.save.mockResolvedValue(saved);

            const res = await repo.updateOneWithHistory(5, dto);

            expect(inventoryRepoORM.save).toHaveBeenCalledTimes(1);
            expect(inventoryRepoORM.save).toHaveBeenCalledWith(expectedPayload);
            expect(res).toStrictEqual(saved);
        });
    });
});
