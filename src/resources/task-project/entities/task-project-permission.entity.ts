import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from "typeorm";
import { Users } from '../../users/entities/users.entity';
import { TaskProject } from './task-project.entity';

@Index("taskProjectPermission_users_id_fk", ["userId"], {})
@Entity("taskProjectPermission")
export class TaskProjectPermission {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
      id: number;

  @Column("int", { name: "projectId", nullable: true })
      projectId: number | null;

  @Column("int", { name: "userId" })
      userId: number;

  @Column("enum", {
      name: "permission",
      nullable: true,
      enum: ["read", "write", "admin"],
  })
      permission: "read" | "write" | "admin" | null;

  @ManyToOne(
      () => TaskProject,
      (taskProject) => taskProject.taskProjectPermissions,
      { onDelete: 'CASCADE', orphanedRowAction: 'delete' }
  )
  @JoinColumn([{ name: "projectId", referencedColumnName: "id" }])
      project: TaskProject;

  @ManyToOne(() => Users, (users) => users.taskProjectPermissions, { eager: true })
  @JoinColumn([{ name: "userId", referencedColumnName: "id" }])
      user: Users;
}
