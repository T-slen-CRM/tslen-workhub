import { Column, Entity, OneToMany } from 'typeorm';
import { CompanyDaysOffRules } from '../../company-days-off-rules/entities/company-days-off-rules.entity';
import { DaysOffSchedulerEntity } from '../../company-days-off-rules/entities/days-off-scheduler.entity';
import { UserGroup } from '../../user-group/entities/user-group.entity';
import { BaseAbstractEntity } from '../../../common/entities/base/base.abstract.entity';

@Entity("company")
export class Company extends BaseAbstractEntity<Company> {
    constructor (entity: Partial<Company>) {
        super(entity);
    }
    @Column("varchar", { name: "name", nullable: true, length: 250 })
        name: string | null;

    @Column("varchar", { name: "country", nullable: true, length: 250 })
        country: string | null;

    @OneToMany(
        () => CompanyDaysOffRules,
        (companyDaysOffRules) => companyDaysOffRules.company, { cascade: true }
    )
        companyDaysOffRules: CompanyDaysOffRules[];

    @OneToMany(
        () => DaysOffSchedulerEntity,
        (daysOffScheduler) => daysOffScheduler.company, { cascade: true }
    )
        daysOffSchedulers: DaysOffSchedulerEntity[];

    @OneToMany(() => UserGroup, (usersGroup) => usersGroup.company)
        usersGroups: UserGroup[];
}
