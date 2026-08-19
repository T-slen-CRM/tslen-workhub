import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Users } from '../../users/entities/users.entity';

@Entity("jobPosition")
export class JobPosition {
    @PrimaryGeneratedColumn({ type: "int", name: "id" })
        id: number;

    @Column("varchar", { name: "title", nullable: true, length: 255 })
        title: string | null;

    @OneToMany(() => Users, (users) => users.jobPosition)
        users: Users[];
}

