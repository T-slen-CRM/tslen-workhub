import { Module } from '@nestjs/common';
import { CronsService } from './crons.service';
import { CronsRepository } from './crons.repository';
import { SchedulerRegistryService } from '../services/scheduler-registry/scheduler-registry.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Crons } from './crons.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Crons])
    ],
    providers: [
        CronsRepository,
        SchedulerRegistryService,
        {
            provide: CronsService,
            useFactory: async (cronsRepository: CronsRepository, schedulerRegistryService: SchedulerRegistryService) => {
                const service = new CronsService(cronsRepository, schedulerRegistryService);
                await service.init();
            },
            inject: [CronsRepository, SchedulerRegistryService],
        }
    ],
    exports: [CronsService, CronsRepository],
})
export class CronsModule {}
