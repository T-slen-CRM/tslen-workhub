import { TestBed } from '@automock/jest';
import { InventoryController } from '../../../../src/resources/inventory/inventory.controller';
import { InventoryService } from '../../../../src/resources/inventory/inventory.service';
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

describe('InventoryController (unit)', () => {
    let controller: InventoryController;
    let service: jest.Mocked<InventoryService>;

    beforeAll(() => {
        const { unit, unitRef } = TestBed.create(InventoryController).compile();
        controller = unit;
        service = unitRef.get(InventoryService);
    });

    afterEach(() => jest.clearAllMocks());

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('create() call service.createInventory', async () => {
        const dto = makeCreateDto({ name: 'Laptop', userId: 10 });
        const saved = makeInventoryEntity({ id: 1, name: dto.name, userId: dto.userId });

        service.createInventory.mockResolvedValue(saved);

        const result = await controller.create(dto);

        expect(service.createInventory).toHaveBeenCalledTimes(1);
        expect(service.createInventory).toHaveBeenCalledWith(dto);
        expect(result).toStrictEqual(saved);
    });

    it('findAll() call service.findAllInventory', async () => {
        const list = [makeInventoryEntity({ id: 1 }), makeInventoryEntity({ id: 2 })];
        service.findAllInventory.mockResolvedValue(list);

        const result = await controller.findAll();

        expect(service.findAllInventory).toHaveBeenCalledTimes(1);
        expect(result).toStrictEqual(list);
    });

    it('findOne() call service.getInventoryWithHistory', async () => {
        const item = makeInventoryEntity({ id: 42 });
        service.getInventoryWithHistory.mockResolvedValue(item);

        const result = await controller.findOne(42);

        expect(service.getInventoryWithHistory).toHaveBeenCalledTimes(1);
        expect(service.getInventoryWithHistory).toHaveBeenCalledWith(42);
        expect(result).toStrictEqual(item);
    });

    it('update() call service.updateInventoryWithHistory', async () => {
        const dto = makeUpdateDto({ userId: 99 });
        const updated = makeInventoryEntity({ id: 7, userId: 99 });

        service.updateInventoryWithHistory.mockResolvedValue(updated);

        const result = await controller.update(7, dto);

        expect(service.updateInventoryWithHistory).toHaveBeenCalledTimes(1);
        expect(service.updateInventoryWithHistory).toHaveBeenCalledWith(7, dto);
        expect(result).toStrictEqual(updated);
    });

    it('create() error bad ', async () => {
        const dto = makeCreateDto({ name: 'Bad', userId: 1 });
        service.createInventory.mockRejectedValue(new Error('boom'));

        await expect(controller.create(dto)).rejects.toThrow('boom');
        expect(service.createInventory).toHaveBeenCalledTimes(1);
    });
});
