import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
} from 'typeorm';
import { Tasks } from './task.entity';
import { Users } from '../../users/entities/users.entity';
import { BaseAbstractEntity } from '../../../common/entities/base/base.abstract.entity';

@Index("taskComments_tasks_id_fk", ["taskId"], {})
@Index("taskComments_users_id_fk", ["userId"], {})
@Entity("taskComments")
export class TaskComment extends BaseAbstractEntity<TaskComment> {
    constructor (entity: Partial<TaskComment>) {
        super(entity);
    }

    @Column("int", { name: "taskId", nullable: true })
        taskId: number | null;

    @Column("int", { name: "userId", nullable: true })
        userId: number | null;

    @Column("text", { name: "content" })
        content: string;

    @CreateDateColumn({ name: "createdAt" })
        createdAt: Date;

    @ManyToOne(() => Tasks, {
        onDelete: "CASCADE",
        orphanedRowAction: "delete",
    })
    @JoinColumn([{ name: "taskId", referencedColumnName: "id" }])
        task: Tasks;

    @ManyToOne(() => Users, { eager: true })
    @JoinColumn([{ name: "userId", referencedColumnName: "id" }])
        user: Users;
}
