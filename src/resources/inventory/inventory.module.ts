import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { Inventory } from './entities/inventory.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { InventoryByUserHistory } from './entities/inventory-by-user-history.entity';
import { Users } from '../users/entities/users.entity';
import { ErrorService } from '../../common/services/error/error.service';
import { SlackService } from '../../common/services/slack/slack.service';
import { PermissionGuard } from '../../common/guards/permissioon/permission.guard';

@Module({
    imports: [
        TypeOrmModule.forFeature([Inventory, InventoryByUserHistory, Users]),
    ],
    controllers: [InventoryController],
    providers: [InventoryService,
        InventoryRepository,
        ErrorService,
        SlackService,
        PermissionGuard],
})
export class InventoryModule {}
