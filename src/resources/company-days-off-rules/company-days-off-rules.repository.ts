import { CompanyDaysOffRules } from './entities/company-days-off-rules.entity';
import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export class CompanyDaysOffRulesRepository extends BaseAbstractRepository<CompanyDaysOffRules> {
    constructor (
    @InjectRepository(CompanyDaysOffRules)
    private readonly companyDaysOffRulesRepository: Repository<CompanyDaysOffRules>,
    ) {
        super(companyDaysOffRulesRepository);
    }
    async getOneWithRelations (campaignId: number): Promise<CompanyDaysOffRules> {
        const qb = this.companyDaysOffRulesRepository.createQueryBuilder('companyDaysOffRules');
        qb.leftJoinAndSelect('companyDaysOffRules.company', 'companies');
        qb.leftJoinAndSelect('companies.daysOffSchedulers', 'daysOffSchedulers');
        qb.where(`companyDaysOffRules.companyId = ${campaignId}`);
        return await qb.getOne();

    }
}
