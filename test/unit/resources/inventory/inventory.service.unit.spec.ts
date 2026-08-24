import { TestBed } from '@automock/jest';
import { InventoryService } from '../../../../src/resources/inventory/inventory.service';
import { InventoryRepository } from '../../../../src/resources/inventory/inventory.repository';
import { Inventory } from '../../../../src/resources/inventory/entities/inventory.entity';
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
    name: 'Laptop',
    userId: 10,
    description: 'Desc',
    serialNumber: 'SN123',
    category: 'IT',
    location: 'HQ',
    department: 'IT',
    subDivision: 'Dev',
    price: '1000',
    warrantyDate: '2030-01-01',
    code: 'INV001',
    inventoryByUserHistory: [],
    user: null,
    ...p,
});

const makeUpdateDto = (p: Partial<UpdateInventoryDto> = {}): UpdateInventoryDto => ({
    userId: 99,
    ...p,
});

describe('InventoryService (unit)', () => {
    let service: InventoryService;
    let repo: jest.Mocked<InventoryRepository>;

    beforeAll(() => {
        const { unit, unitRef } = TestBed.create(InventoryService).compile();
        service = unit;
        repo = unitRef.get(InventoryRepository);
    });

    afterEach(() => jest.clearAllMocks());

    it('createInventory() calls repository.createOneWithHistory and returns the result', async () => {
        const dto = makeCreateDto();
        const saved = makeInventoryEntity({ id: 101, name: dto.name, userId: dto.userId });

        repo.createOneWithHistory.mockResolvedValue(saved);

        const result = await service.createInventory(dto);
        expect(repo.createOneWithHistory).toHaveBeenCalledTimes(1);
        expect(repo.createOneWithHistory).toHaveBeenCalledWith(dto);
        expect(result).toStrictEqual(saved);
    });

    it('findAllInventory() calls repository.findAllInventory and returns the list', async () => {
        const list = [makeInventoryEntity({ id: 1 }), makeInventoryEntity({ id: 2 })];
        repo.findAllInventory.mockResolvedValue(list);

        const result = await service.findAllInventory();
        expect(repo.findAllInventory).toHaveBeenCalledTimes(1);
        expect(result).toStrictEqual(list);
    });

    it('getInventoryWithHistory() calls repository.getOneWithHistory and returns the item', async () => {
        const item = makeInventoryEntity({ id: 42 });
        repo.getOneWithHistory.mockResolvedValue(item);

        const result = await service.getInventoryWithHistory(42);
        expect(repo.getOneWithHistory).toHaveBeenCalledWith(42);
        expect(result).toStrictEqual(item);
    });

    it('updateInventoryWithHistory() calls repository.updateOneWithHistory and returns the updated entity', async () => {
        const dto = makeUpdateDto({ userId: 77 });
        const updated = makeInventoryEntity({ id: 7, userId: 77 });
        repo.updateOneWithHistory.mockResolvedValue(updated);

        const result = await service.updateInventoryWithHistory(7, dto);
        expect(repo.updateOneWithHistory).toHaveBeenCalledWith(7, dto);
        expect(result).toStrictEqual(updated);
    });

    it('createInventory() propagates the repository error', async () => {
        const dto = makeCreateDto({ name: 'Bad' });
        repo.createOneWithHistory.mockRejectedValue(new Error('boom'));

        await expect(service.createInventory(dto)).rejects.toThrow('boom');
        expect(repo.createOneWithHistory).toHaveBeenCalledTimes(1);
    });
});
