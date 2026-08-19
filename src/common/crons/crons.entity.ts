import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseAbstractEntity } from '../entities/base/base.abstract.entity';
import { Company } from '../../resources/company/entities/company.entity';

@Entity("crons")
export class Crons extends BaseAbstractEntity<Crons> {
    constructor (entity: Partial<Crons>) {
        super(entity);
    }
  @Column("varchar", { name: "name", nullable: true, length: 250 })
      name: string | null;

  @Column("int", { name: "companyId", nullable: false })
      companyId: number;

  @Column("varchar", { name: "time", nullable: true, length: 250 })
      time: string | null;

  @Column("smallint", { name: "status", default: () => "'1'" })
      status: number | null;

  @Column("varchar", { name: "type", nullable: false, length: 250 })
      type: string;

  @ManyToOne(() => Company, (company) => company.id)
  @JoinColumn([{ name: "companyId", referencedColumnName: "id" }])
      company: Company;
}
