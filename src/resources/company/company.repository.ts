import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';

export class CompanyRepository extends BaseAbstractRepository<Company> {
    constructor (
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    ) {
        super(companyRepository);
    }
}
