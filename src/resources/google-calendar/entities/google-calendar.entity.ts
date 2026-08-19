import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
} from 'typeorm';
import { Users } from '../../users/entities/users.entity';
import { BaseAbstractEntity } from '../../../common/entities/base/base.abstract.entity';

@Index("googleCalendar_users_id_fk", ["userId"], {})
@Entity("googleCalendar")
export class GoogleCalendar extends BaseAbstractEntity<GoogleCalendar>{
    constructor (entity: Partial<GoogleCalendar>) {
        super(entity);
    }
  @Column("int", { name: "userId", nullable: true })
      userId: number | null;

  @Column("varchar", { name: "calendarId" })
      calendarId: string;

  @Column("varchar", { name: "timezone", nullable: true })
      timezone: string | null;

  @ManyToOne(() => Users, (users) => users.googleCalendars, {
      onDelete: "NO ACTION",
      onUpdate: "NO ACTION",
  })
  @JoinColumn([{ name: "userId", referencedColumnName: "id" }])
      user: Users;
}

