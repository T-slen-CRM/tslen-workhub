import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
} from "typeorm";
import { TaskPhase } from '../../task-phase/entities/task-phase.entity';
import { TaskProject } from './task-project.entity';
import { BaseAbstractEntity } from '../../../common/entities/base/base.abstract.entity';
@Index("projectPhasesRelation_taskPhase_id_fk", ["phaseId"], {})
@Index("projectPhasesRelation_taskProject_id_fk", ["projectId"], {})
@Entity("projectPhasesRelation")
export class ProjectPhasesRelation extends BaseAbstractEntity<ProjectPhasesRelation>{
    constructor (entity: Partial<ProjectPhasesRelation>) {
        super(entity);
    }
  @Column("int", { name: "projectId", nullable: true })
      projectId: number | null;

  @Column("int", { name: "phaseId", nullable: true })
      phaseId: number | null;

  @Column("int", { name: "orderId", nullable: true })
      orderId: number | null;

  @ManyToOne(() => TaskPhase, (taskPhase) => taskPhase.id, {
      onDelete: "CASCADE",
      orphanedRowAction: "delete",
      eager: true
  })
  @JoinColumn([{ name: "phaseId", referencedColumnName: "id" }])
      phase: TaskPhase;

  @ManyToOne(() => TaskProject, (taskProject) => taskProject.projectPhasesRelations, {
      onDelete: "CASCADE",
      orphanedRowAction: "delete",
      eager: true
  })
  @JoinColumn([{ name: "projectId", referencedColumnName: "id" }])
      project: TaskProject;
}
