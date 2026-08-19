import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { OrderInPhase } from './order-in-phase.entity';
import { Tasks } from '../../tasks/entities/task.entity';
import { ProjectPhasesRelation } from '../../task-project/entities/project-phases-relation.entity';
import { TaskProject } from '../../task-project/entities/task-project.entity';

@Entity("taskPhase")
export class TaskPhase {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
      id: number;

  @Column("varchar", { name: "name", nullable: true, length: 250 })
      name: string | null;

  @Column("timestamp", { name: "createdAt", nullable: true })
      createdAt: Date | null;

  @Column("timestamp", { name: "deletedAt", nullable: true })
      deletedAt: Date | null;

  @Column("timestamp", { name: "updatedAt", nullable: true })
      updatedAt: Date | null;

  @ManyToOne(() => TaskProject, (taskProject) => taskProject.phases)
      taskProject: TaskProject;

  @OneToMany(() => OrderInPhase, (orderInPhase) => orderInPhase.phases)
      orderInPhases: OrderInPhase[];

  @OneToMany(
      () => ProjectPhasesRelation,
      (projectPhasesRelation) => projectPhasesRelation.phase, { cascade: true }
  )
      projectPhasesRelations: ProjectPhasesRelation[];

  @OneToMany(() => Tasks, (tasks) => tasks.phases, {
      eager: true,
      cascade: true
  })
      tasks: Tasks[];
}
