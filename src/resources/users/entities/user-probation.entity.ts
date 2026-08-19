import {
    Column,
    Entity,
    Index,
    JoinColumn,
    OneToOne
} from "typeorm";
import { Users } from './users.entity';
import { BaseAbstractEntity } from '../../../common/entities/base/base.abstract.entity';

@Index("userProbation_users_id_fk", ["userId"], {})
@Entity("userProbation")
export class UserProbationEntity extends BaseAbstractEntity<UserProbationEntity>{
constructor (entity: Partial<UserProbationEntity>) {
        super(entity);
    }
  @Column("int", { name: "userId", nullable: true })
      userId: number | null;

  @Column("date", { name: "start", nullable: true })
      start: string | null;

  @Column("date", { name: "end", nullable: true })
      end: string | null;

  @Column("boolean", {
    name: "isProbation",
    default: false
  })
      isProbation: boolean | null;

  @OneToOne(() => Users, (users) => users.userProbation, {
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "userId", referencedColumnName: "id" }])
      user: Users;
}
