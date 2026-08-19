import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { Inventory } from './entities/inventory.entity';
import { InventoryByUserHistory } from './entities/inventory-by-user-history.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

export class InventoryRepository extends BaseAbstractRepository<Inventory> {
    constructor (
     @InjectRepository(Inventory)
     private readonly inventoryRepository: Repository<Inventory>,
     @InjectRepository(InventoryByUserHistory)
     private readonly inventoryByUserHistoryRepository: Repository<InventoryByUserHistory>,
     private readonly entityManager: EntityManager ,
    ) {
        super(inventoryRepository);
    }
    public async createOneWithHistory (createInventoryDto: CreateInventoryDto): Promise<Inventory> {
        console.log('create inventory - ', createInventoryDto);
        return this.inventoryRepository.save(createInventoryDto);
    }

    public async findAllInventory () {
        return this.inventoryRepository.find();
    }

    public async getOneWithHistory (id: number): Promise<Inventory> {
        return await this.inventoryRepository.findOne({ where: { id },
        });
    }

    public async updateOneWithHistory (id: number, updateInventoryDto: UpdateInventoryDto): Promise<Inventory> {
        return this.inventoryRepository.save({ id, ...updateInventoryDto });
    }
}
