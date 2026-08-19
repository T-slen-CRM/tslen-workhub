import { Module } from '@nestjs/common';
import { TaskPhaseService } from './task-phase.service';
import { TaskPhaseController } from './task-phase.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskPhaseRepository } from './task-phase.repository';
import { TaskPhase } from './entities/task-phase.entity';
import { OrderInPhase } from './entities/order-in-phase.entity';

@Module({
    imports: [TypeOrmModule.forFeature([TaskPhase, OrderInPhase])],
    controllers: [TaskPhaseController],
    providers: [
        TaskPhaseService,
        TaskPhaseRepository
    ],
    exports: [TaskPhaseRepository],
})
export class TaskPhaseModule {}
