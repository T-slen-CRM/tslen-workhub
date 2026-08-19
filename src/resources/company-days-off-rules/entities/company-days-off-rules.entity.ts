import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne
} from 'typeorm';
import { BaseAbstractEntity } from '../../../common/entities/base/base.abstract.entity';
import { Company } from '../../company/entities/company.entity';

@Index("companyDaysOffRules_companyId_id_fk", ["companyId"], {})
@Entity("companyDaysOffRules")
export class CompanyDaysOffRules extends BaseAbstractEntity<CompanyDaysOffRules>{
    constructor (entity: Partial<CompanyDaysOffRules>) {
        super(entity);
    }
  @Column("int", { name: "companyId" })
      companyId: number;

  @Column("int", { name: "hospital", nullable: true, default: () => "'11'" })
      hospital: number | null;

  @Column("int", { name: "timeOff", nullable: true, default: () => "'11'" })
      timeOff: number | null;

  @Column("int", { name: "vocation", nullable: true, default: () => "'11'" })
      vocation: number | null;

  @Column("int", { name: "transfer", nullable: true, default: () => "'11'" })
      transfer: number | null;

  @Column("int", { name: "home", nullable: true, default: () => "'11'" })
      home: number | null;

  @Column("smallint", {
      name: "useScheduler",
      nullable: true,
      default: () => "'0'",
  })
      useScheduler: number | null;

  @Column("smallint", {
      name: "resetYearly",
      default: () => "'0'",
  })
      resetYearly: number;

  @ManyToOne(() => Company, (company) => company.id)
  @JoinColumn([{ name: "companyId", referencedColumnName: "id" }])
      company: Company;
}
