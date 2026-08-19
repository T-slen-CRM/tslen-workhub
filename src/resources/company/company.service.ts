import { Injectable } from '@nestjs/common';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { Company } from './entities/company.entity';
import { CompanyRepository } from './company.repository';

@Injectable()
export class CompanyService extends BaseAbstractService<Company> {
    constructor (
    private readonly repository: CompanyRepository,
    ) {
        super(repository, null);
        this.currentRepository = repository;
    }

}
