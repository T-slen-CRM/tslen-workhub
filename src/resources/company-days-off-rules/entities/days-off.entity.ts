import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne
} from "typeorm";
import { Users } from '../../users/entities/users.entity';
import { BaseAbstractEntity } from '../../../common/entities/base/base.abstract.entity';

@Index("daysOff_users_null_fk", ["userId"], {})
@Entity("daysOff")
export class DaysOffEntity extends BaseAbstractEntity<DaysOffEntity>{
    constructor (entity: Partial<DaysOffEntity>) {
        super(entity);
    }
  @Column("int", { name: "userId" })
      userId: number | null;

  @Column("int", { name: "companyId" })
      companyId: number;

  @Column("double precision", {
      name: "hospital",
      nullable: true,
      default: () => "'0'",
  })
      hospital: number | null;

  @Column("double precision", {
      name: "timeOff",
      nullable: true,
      default: () => "'0'",
  })
      timeOff: number | null;

  @Column("double precision", {
      name: "vocation",
      nullable: true,
      default: () => "'0'",
  })
      vocation: number | null;

  @Column("double precision", {
      name: "transfer",
      nullable: true,
      default: () => "'30'",
  })
      transfer: number | null;

  @Column("double precision", {
      name: "home",
      nullable: true,
      default: () => "'10'",
  })
      home: number | null;

  @ManyToOne(() => Users, (user) => user.id, {
      onDelete: "NO ACTION",
      onUpdate: "NO ACTION",
  })
  @JoinColumn([{ name: "userId", referencedColumnName: "id" }])
      user: Users;

    // @ManyToOne(() => Company, (company) => company.id)
    // @JoinColumn([{ name: "companyId", referencedColumnName: "id" }])
    //     company: Company;
}
