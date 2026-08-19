import {
    Column,
    Entity, JoinColumn, ManyToOne,
} from 'typeorm';
import { Tasks } from './task.entity';
import { BaseAbstractEntity } from '../../../common/entities/base/base.abstract.entity';

@Entity("taskAttachments")
export class TaskAttachments extends BaseAbstractEntity<TaskAttachments>{
    constructor (entity: Partial<TaskAttachments>) {
        super(entity);
    }
    @Column("int", { name: "taskId", nullable: true })
        taskId: number | null;

    @Column("varchar", { name: "name", nullable: true, length: 500 })
        name: string;

    @Column("varchar", { name: "url", length: 1100 })
        url: string;

    @Column("varchar", { name: "originName", length: 255, })
        originName: string;

    @Column("varchar", { name: "extension", nullable: true, length: 255, })
        extension: string | null;

    @Column("varchar", { name: "type", nullable: true, length: 255 })
        type: string | null;

    @ManyToOne(() => Tasks, (tasks) => tasks.taskAttachments, {
        onDelete: "CASCADE",
        orphanedRowAction: "delete"
    })
    @JoinColumn([{ name: "taskId", referencedColumnName: "id" }])
        task: Tasks;
}
