import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne, Unique
} from 'typeorm';
import { BaseAbstractEntity } from '../../../common/entities/base/base.abstract.entity';
import { Users } from './users.entity';

// @Index("userGooglePermission_users_id_fk", ["userId"], {})
@Unique(['userId'])
@Entity("userGooglePermission")
export class UserGooglePermission extends BaseAbstractEntity<UserGooglePermission>{
    constructor (entity: Partial<UserGooglePermission>) {
        super(entity);
    }
  @Column("int", { name: "userId", nullable: true })
      userId: number | null;

  @Column("smallint", { name: "email", default: 0 })
      email: number;

  @Column("smallint", { name: "calendar", default: 0 })
      calendar: number;

  @Column("smallint", { name: "meetingSpace", default: 0 })
      meetingSpace: number;


  @ManyToOne(() => Users, (users) => users.googlePermissions, {
      onDelete: "NO ACTION",
      onUpdate: "NO ACTION",
  })
  @JoinColumn([{ name: "userId", referencedColumnName: "id" }])
      user: Users;
}

