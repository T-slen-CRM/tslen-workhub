import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Inventory } from './entities/inventory.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { PermissionGuard } from '../../common/guards/permissioon/permission.guard';
import { Permission } from '../../common/guards/permissioon/permission.enum';
import { Permissions } from '../../common/guards/permissioon/permission.decorator';

@UseGuards(PermissionGuard)
@Controller('inventory')
export class InventoryController {
    constructor (private readonly inventoryService: InventoryService) {}

  @Post('/create')
    create (@Body() dto: CreateInventoryDto): Promise<Inventory> {
        return this.inventoryService.createInventory(dto);
    }

  @Get()
  findAll (): Promise<Inventory[]> {
      return this.inventoryService.findAllInventory();
  }

  @Get(':id([0-9]+)')
  findOne (@Param('id', ParseIntPipe) id: number) {
      return this.inventoryService.getInventoryWithHistory(id);

  }
  @Permissions(Permission.Id)
  @Patch(':id')
  update (@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInventoryDto): Promise<Inventory> {
      return this.inventoryService.updateInventoryWithHistory(id, dto);
  }
}
