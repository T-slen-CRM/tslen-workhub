import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
        id: number;

    @Column('int', { name: 'userId' })
        userId: number;

    @Column('varchar', { name: 'title', length: 250 })
        title: string;

    @Column('varchar', { name: 'message', length: 500 })
        message: string;

    @Column('int', { name: 'isRead', default: 0 })
        isRead: number;

    @Column('varchar', { name: 'link', nullable: true, length: 500 })
        link: string | null;

    @CreateDateColumn({ name: 'createdAt' })
        createdAt: Date;
}
