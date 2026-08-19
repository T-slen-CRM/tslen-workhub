import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Users } from '../../users/entities/users.entity';
import { BaseAbstractEntity } from '../../../common/entities/base/base.abstract.entity';
import { EventAttendees } from './event-attendees.entity';

@Index("eventsByUser_users_null_fk", ["userId"], {})
@Entity("eventsByUser")
export class EventsByUser extends BaseAbstractEntity<EventsByUser>{
    constructor (entity: Partial<EventsByUser>) {
        super(entity);
    }
  @Column("int", { name: "userId", nullable: true })
      userId: number | null;

  @Column("text", { name: "title", nullable: true })
      title: string | null;

  @Column("timestamp", { name: "start", nullable: true })
      start: Date;

  @Column("timestamp", { name: "end", nullable: true })
      end: Date;

  @Column("varchar", { name: "primaryColor", nullable: true, length: 250 })
      primaryColor: string | null;

  @Column("varchar", { name: "secondaryColor", nullable: true, length: 250 })
      secondaryColor: string | null;

  @Column("boolean", {
      name: "isRequest",
      nullable: false,
      default: false
  })
      isRequest: boolean;

  @Column("int", {
      name: "approved",
      nullable: false,
      default: '0'
  })
      approved: number;

  @Column("text", { name: "comment", nullable: true })
      comment: string;

  @Column("varchar", { name: "requestType", nullable: true, length: 250 })
      requestType: string;

  @Column("timestamp", { name: "createdAt", nullable: true })
      createdAt: Date | null;

  @Column("float", { name: "timeOffset", nullable: true })
      timeOffset: number;

  @Column("varchar", { name: "googleId", length: 250, nullable: true })
      googleId: string;

  @Column("boolean", {
      name: "isGoogleEvent",
      nullable: false,
      default: false
  })
      isGoogleEvent: boolean;

  @Column("varchar", { name: "googleMeetLink", nullable: true, length: 550 })
      googleMeetLink: string;

  @Column("varchar", { name: "googleCalendarId", nullable: true, length: 550 })
      googleCalendarId: string | null;

  @Column("varchar", { name: "secretToken", length: 250, nullable: true })
      secretToken: string;

  @ManyToOne(() => Users, (users) => users.eventsByUsers, {
      onDelete: "NO ACTION",
      onUpdate: "NO ACTION",
  })
  @JoinColumn([{ name: "userId", referencedColumnName: "id" }])
      user: Users;

  @OneToMany(() => EventAttendees, (attendees) => attendees.event, { cascade: true, eager: true })
      attendees: EventAttendees[];
}
