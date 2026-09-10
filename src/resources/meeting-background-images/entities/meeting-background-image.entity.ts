import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Users } from '../../users/entities/users.entity';

@Index('meetingBackgroundImages_userId_fk', ['userId'], {})
@Entity('meetingBackgroundImages')
export class MeetingBackgroundImage {
    @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
        id: number;

    @Column('int', { name: 'userId' })
        userId: number;

    @Column('varchar', { name: 'url', length: 1100 })
        url: string;

    @Column('varchar', { name: 'originName', length: 255 })
        originName: string;

    @Column('varchar', { name: 'type', nullable: true, length: 255 })
        type: string | null;

    @CreateDateColumn({ name: 'createdAt' })
        createdAt: Date;

    @ManyToOne(() => Users, { onDelete: 'CASCADE' })
    @JoinColumn([{ name: 'userId', referencedColumnName: 'id' }])
        user: Users;
}
