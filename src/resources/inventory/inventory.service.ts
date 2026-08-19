import { Injectable } from '@nestjs/common';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { Inventory } from './entities/inventory.entity';
import { InventoryRepository } from './inventory.repository';
import { ErrorService } from '../../common/services/error/error.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';

@Injectable()
export class InventoryService extends BaseAbstractService<Inventory> {
    constructor (
        protected readonly repository: InventoryRepository,
        protected readonly errorService: ErrorService,
    ) {
        super(repository, errorService);
        this.currentRepository = repository;
    }
    async createInventory (createInventoryDto: CreateInventoryDto): Promise<Inventory> {
        return this.currentRepository.createOneWithHistory(createInventoryDto);
    }
    async findAllInventory () {
        return this.currentRepository.findAllInventory();
    }
    async getInventoryWithHistory (id: number): Promise<Inventory> {
        return this.currentRepository.getOneWithHistory(id);
    }

    async updateInventoryWithHistory (id: number, updateInventoryDto: any): Promise<Inventory> {
        return this.currentRepository.updateOneWithHistory(id, updateInventoryDto);
    }
}
