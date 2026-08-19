import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TaskProjectPermission } from './task-project-permission.entity';
import { Tasks } from '../../tasks/entities/task.entity';
import { ProjectPhasesRelation } from './project-phases-relation.entity';
import { TaskPhase } from '../../task-phase/entities/task-phase.entity';

@Entity("taskProject")
export class TaskProject {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
      id: number;

  @Column("int", { name: "companyId", nullable: true })
      companyId: number | null;

  @Column("varchar", { name: "name", nullable: true, length: 250 })
      name: string | null;

  @Column("varchar", { name: "logo", nullable: true, length: 250 })
      logo: string | null;

  @Column("varchar", { name: "description", nullable: true, length: 250 })
      description: string | null;

  @Column("varchar", { name: "slackChannel", nullable: true, length: 200 })
      slackChannel: string | null;

  @Column("int", { name: "isPrivate", nullable: true, default: () => "'0'" })
      isPrivate: number | null;

  @Column("timestamp", { name: "createdAt", nullable: true })
      createdAt: Date | null;

  @Column("timestamp", { name: "deletedAt", nullable: true })
      deletedAt: Date | null;

  @OneToMany(
      () => ProjectPhasesRelation,
      (projectPhasesRelation) => projectPhasesRelation.project, { cascade: true }
  )
      projectPhasesRelations: ProjectPhasesRelation[];

  @OneToMany(
      () => TaskProjectPermission,
      (taskProjectPermission) => taskProjectPermission.project,  { cascade: true }
  )
      taskProjectPermissions: TaskProjectPermission[];

  @OneToMany(() => Tasks, (tasks) => tasks.project, { cascade: ['remove', 'soft-remove'] })
      tasks: Tasks[];
  //phases
  @OneToMany(() => TaskPhase, (taskPhase) => taskPhase.taskProject, { cascade: true })
      phases: TaskPhase[];
}
