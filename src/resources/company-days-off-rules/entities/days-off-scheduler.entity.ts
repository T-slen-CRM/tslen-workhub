import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
} from "typeorm";
import { Company } from '../../company/entities/company.entity';
import { BaseAbstractEntity } from '../../../common/entities/base/base.abstract.entity';

@Index("daysOffScheduler_company_id_fk", ["companyId"], {})
@Entity("daysOffScheduler")
export class DaysOffSchedulerEntity extends BaseAbstractEntity<DaysOffSchedulerEntity> {
    constructor (entity: Partial<DaysOffSchedulerEntity>) {
        super(entity);
    }

  @Column({
      type: "enum",
      enum: ["hospital", "timeOff", "vocation", "transfer", "home"], // PostgreSQL-compatible enum
      name: "requestType",
  })
      requestType: "hospital" | "timeOff" | "vocation" | "transfer" | "home";

  @Column({
      type: "double precision", // PostgreSQL uses double precision without precision arguments
      name: "timeCoefficient",
      nullable: true,
  })
      timeCoefficient: number | null;

  @Column({
      type: "enum",
      enum: ["month"], // Define PostgreSQL-compatible enum values
      name: "repeatBy",
      nullable: true,
  })
      repeatBy: "month" | null;

  @Column({
      type: "integer", // Use PostgreSQL integer type
      name: "companyId",
      nullable: true,
  })
      companyId: number | null;

  @ManyToOne(() => Company, (companies) => companies.daysOffSchedulers)
  @JoinColumn([{ name: "companyId", referencedColumnName: "id" }])
      company: Company;
}
