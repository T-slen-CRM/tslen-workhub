import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn
} from 'typeorm';
import { Users } from './users.entity';

@Index("userChiefRelation_users_null_fk", ["userId"], {})
@Entity("userChiefRelation")
export class UserChiefRelationEntity {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
      id: number;

  @Column("int", { name: "userId" })
      userId: number;

  @Column("int", { name: "chiefId" })
      chiefId: number;

  @ManyToOne(() => Users, (users) => users.userChiefRelationsByChief)
  @JoinColumn([{ name: "chiefId", referencedColumnName: "id" }])
      chief: Users;

  @ManyToOne(() => Users, (users) => users.userChiefRelations)
  @JoinColumn([{ name: "userId", referencedColumnName: "id" }])
      user: Users;
}
