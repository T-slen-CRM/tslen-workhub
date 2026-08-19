import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from "typeorm";
import { Users } from '../../users/entities/users.entity';
import { Tasks } from './task.entity';

@Index("taskUserAssignmentRelation__tskId_fk", ["taskId"], {})
@Index("taskUserAssignmentRelation_users_id_fk", ["userId"], {})
@Entity("taskUserAssignmentRelation")
export class TaskUserAssignmentRelation {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
      id: number;

  @Column("int", { name: "taskId", nullable: true })
      taskId: number | null;

  @Column("int", { name: "userId", nullable: true })
      userId: number | null;

  @ManyToOne(() => Users, (users) => users.taskUserAssignmentRelations, { eager: true })
  @JoinColumn([{ name: "userId", referencedColumnName: "id" }])
      user: Users;

  @ManyToOne(() => Tasks, (tasks) => tasks.taskUserAssignmentRelations,
      { onDelete: 'CASCADE', orphanedRowAction: 'delete' })
  @JoinColumn([{ name: "taskId", referencedColumnName: "id" }])
      task: Tasks;
}
