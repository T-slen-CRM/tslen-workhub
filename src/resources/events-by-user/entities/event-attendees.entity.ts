import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseAbstractEntity } from '../../../common/entities/base/base.abstract.entity';
import { EventsByUser } from './events-by-user.entity';

@Entity('eventAttendees')
export class EventAttendees extends BaseAbstractEntity<EventAttendees>{
    constructor (entity: Partial<EventAttendees>) {
        super(entity);
    }

    @Column('int', { name: 'eventId', nullable: true })
        eventId: number | null;

    @Column('varchar', { name: 'userEmail', nullable: true, length: 250 })
        userEmail: string | null;

    // @ManyToOne(() => Users, (users) => users.eventAttendees)
    // user: Users;
  @ManyToOne(() => EventsByUser, (events) => events.attendees)
  @JoinColumn([{ name: "eventId", referencedColumnName: "id" }])
      event: EventsByUser;


}
