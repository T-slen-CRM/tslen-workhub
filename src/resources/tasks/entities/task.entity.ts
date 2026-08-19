import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne, OneToMany, OneToOne,
    PrimaryGeneratedColumn
} from 'typeorm';
import { TaskPhase } from '../../task-phase/entities/task-phase.entity';
import { TaskProject } from '../../task-project/entities/task-project.entity';
import { TaskAttachments } from './task-attachments.entity';
import { OrderInPhase } from '../../task-phase/entities/order-in-phase.entity';
import { TaskUserAssignmentRelation } from './taskUserAssignment.entity';

@Index("tasks_taskPhase_id_fk", ["phaseId"], {})
@Index("tasks_taskProject_id_fk", ["projectId"], {})
@Entity({ name: "tasks", orderBy: { orderId: "ASC" } })
export class Tasks {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
      id: number;

  @Column("varchar", { name: "title", nullable: true, length: 500 })
      title: string | null;

  @Column("text", { name: "description", nullable: true })
      description: string | null;

  @Column("varchar", { name: "assignessEmail", nullable: true, length: 250 })
      assignessEmail: string | null;

  @Column("varchar", { name: "priority", length: 100 })
      priority: string | null;

  @Column("timestamp", { name: "estimate", nullable: true })
      estimate: Date | null;

  @Column("timestamp", { name: "createdAt", nullable: true })
      createdAt: Date | null;

  @Column("varchar", { name: "createdBy", nullable: true, length: 250 })
      createdBy: string | null;

  @Column("varchar", { name: "createdByName", nullable: true, length: 250 })
      createdByName: string | null;

  @Column("varchar", { name: "label", nullable: true, length: 250 })
      label: string | null;

  @Column("timestamp", { name: "updatedAt", nullable: true })
      updatedAt: Date | null;

  @Column("int", { name: "phaseId", nullable: true })
      phaseId: number | null;

  @Column("int", { name: "projectId", nullable: true })
      projectId: number | null;

  @Column("int", {
      name: "orderId",
      nullable: true,
      default: '0'
  })
      orderId: number | null;

  @Column("enum", {
      name: "status",
      nullable: true,
      enum: ["unStatus", "inProgress", "hold", "test", "release", "done"],
  })
      status:
    | "unStatus"
    | "inProgress"
    | "hold"
    | "test"
    | "release"
    | "done"
    | null;

  @ManyToOne(() => TaskPhase, (taskPhase) => taskPhase.tasks,
      {
          onDelete: "CASCADE",
          orphanedRowAction: "delete",
      })

  @JoinColumn([{ name: "phaseId", referencedColumnName: "id" }])
      phases: TaskPhase;

  @ManyToOne(() => TaskProject, (taskProject) => taskProject.tasks, {
      onDelete: "CASCADE",
      orphanedRowAction: "delete",
  })
  @JoinColumn([{ name: "projectId", referencedColumnName: "id" }])
      project: TaskProject;

  @OneToMany(() => TaskAttachments, (taskAttachments) => taskAttachments.task, { cascade: true, eager: true })
      taskAttachments: TaskAttachments[];

  @OneToOne(() => OrderInPhase, (orderInPhase) => orderInPhase.task)
      orderInPhases: OrderInPhase;

  @OneToMany(
      () => TaskUserAssignmentRelation,
      (taskUserAssignmentRelation) => taskUserAssignmentRelation.task, { cascade: true, eager: true }
  )
      taskUserAssignmentRelations: TaskUserAssignmentRelation[];
}

