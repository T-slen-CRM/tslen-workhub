import {
  Column,
  Entity,
  Index, JoinColumn, ManyToOne,
  OneToMany,
  OneToOne
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRelationToGroup } from './user-relation-to-group.entity';
import { DaysOffEntity } from '../../company-days-off-rules/entities/days-off.entity';
import { UserChiefRelationEntity } from './user-chief-relation.entity';
import { TaskProjectPermission } from '../../task-project/entities/task-project-permission.entity';
import { UserProbationEntity } from './user-probation.entity';
import { BaseAbstractEntity } from '../../../common/entities/base/base.abstract.entity';
import { EventsByUser } from '../../events-by-user/entities/events-by-user.entity';
import { JobPosition } from '../../job-position/entities/job-position.entity';
import { TaskUserAssignmentRelation } from '../../tasks/entities/taskUserAssignment.entity';
import { Role } from '@tslen-workhub/shared';
import { GoogleCalendar } from '../../google-calendar/entities/google-calendar.entity';
import { UserGooglePermission } from './user-google-permission.entity';
import { Inventory } from '../../inventory/entities/inventory.entity';
import { InventoryByUserHistory } from '../../inventory/entities/inventory-by-user-history.entity';
@Index("email", ["email"], { unique: true })
@Entity("users")
export class Users extends BaseAbstractEntity<Users> {
  constructor (entity: Partial<Users>) {
        super(entity);
    }
  @Column("enum", {
    name: "role",
    enum: Role,
    default: Role.User,
  })
  role: Role;

  @Column("varchar", { name: "firstName", length: 255 })
  firstName: string;

  @Column("varchar", { name: "lastName", length: 255 })
  lastName: string;

  @Column("varchar", { name: "email", unique: true, length: 255 })
  email: string;

  @Column("varchar", { name: "country", nullable: true, length: 255 })
  country: string | null;

  @Exclude()
  @Column("varchar", { name: "password", length: 255 })
  password: string;

  @Column("varchar", { name: "avatar", nullable: true, length: 1000 })
  avatar: string | null;

  @Column("varchar", { name: "company", length: 255 })
  company: string;

  @Column("varchar", { name: "address", nullable: true, length: 255 })
  address: string | null;

  @Column("varchar", { name: "phone", nullable: true, length: 255 })
  phone: string | null;

  @Column("varchar", { name: "skype", nullable: true, length: 64 })
  skype: string | null;

  @Column("varchar", { name: "emailSpare", nullable: true, length: 255 })
  emailSpare: string | null;

  @Exclude()
  @Column("varchar", { name: "tokenActivation", nullable: true, length: 255 })
  tokenActivation: string | null;

  @Exclude()
  @Column("varchar", { name: "tokenReset", nullable: true, length: 255 })
  tokenReset: string | null;

  @Column("smallint", { name: "isActive", default: () => "'0'" })
  isActive: number;

  @Column("int", { name: "loginCount", nullable: true })
  loginCount: number | null;

  @Column("timestamp", { name: "lastLogin", nullable: true })
  lastLogin: Date | null;

  @Column("int", { name: "companyId", nullable: true })
  companyId: number | null;

  @Column("int", { name: "chiefId", nullable: true })
  chiefId: number | null;

  @Column("int", { name: "mentorId", nullable: true })
  mentorId: number | null;

  @Column("date", { name: "birthDay", nullable: true })
  birthDay: Date | null;

  @Column("date", { name: "firstDayInCompany", nullable: true })
  firstDayInCompany: Date | null;

  @Column("date", { name: "lastDayInCompany", nullable: true })
  lastDayInCompany: Date | null;

  @Column("varchar", { name: "jobPosition", nullable: true })
  jobPosition: string | null;

  @Column("varchar", { name: "language", nullable: true })
  language: string | null;

  @OneToMany(
      () => UserRelationToGroup,
      (userRelationToGroup) => userRelationToGroup.user, { cascade: true }
  )
  userRelationToGroups: UserRelationToGroup[];

  @OneToOne(() => DaysOffEntity, (daysOff) => daysOff.user, { cascade: true })
  daysOff: DaysOffEntity[];

  @OneToMany(() => EventsByUser, (eventsByUser) => eventsByUser.user)
  eventsByUsers: EventsByUser[];

  @OneToMany(() => EventsByUser, (eventsByUser) => eventsByUser.user)
  eventsByUsersRequest: EventsByUser[];

  @OneToMany(
      () => UserChiefRelationEntity,
      (userChiefRelation) => userChiefRelation.chief
  )
  userChiefRelationsByChief: UserChiefRelationEntity[];

  @OneToMany(
      () => UserChiefRelationEntity,
      (userChiefRelation) => userChiefRelation.user, { cascade: true, eager: true }
  )
  userChiefRelations: UserChiefRelationEntity[];

  @OneToMany(
      () => TaskProjectPermission,
      (taskProjectPermission) => taskProjectPermission.user
  )
  taskProjectPermissions: TaskProjectPermission[];

  @OneToOne(() => GoogleCalendar, (googleCalendar) => googleCalendar.user)
  googleCalendars: GoogleCalendar;

  @OneToOne(() => UserGooglePermission,
    (userGooglePermission) => userGooglePermission.user, { cascade: true, eager: true })
  googlePermissions: UserGooglePermission;

  @OneToOne(() => UserProbationEntity, (userProbation) => userProbation.user, { cascade: true })
  userProbation: UserProbationEntity;

  @ManyToOne(() => JobPosition, (jobPosition) => jobPosition.users, {
      onDelete: "NO ACTION",
      onUpdate: "NO ACTION",
  })
  @JoinColumn([{ name: "jobPosition", referencedColumnName: "id" }])
  jobPositionDetails: JobPosition[];

  @OneToMany(
    () => TaskUserAssignmentRelation,
    (taskUserAssignmentRelation) => taskUserAssignmentRelation.user
  )
  taskUserAssignmentRelations: TaskUserAssignmentRelation[];

  @OneToMany(() => Inventory, (inventories) => inventories.user)
  inventories: Inventory[];

  @OneToMany(
    () => InventoryByUserHistory,
    (inventoryByUserHistory) => inventoryByUserHistory.user
  )
  inventoryByUserHistory: InventoryByUserHistory[];

}
