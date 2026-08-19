import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { CompanySubscriber } from './subscribers/company.subscriber';
import { CompanyRepository } from './company.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([Company])
    ],
    controllers: [CompanyController],
    providers: [
        CompanyService,
        CompanySubscriber,
        CompanyRepository
    ],
})
export class CompanyModule {}
