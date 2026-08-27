import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Users } from '../../users/entities/users.entity';

@Index('meetingLinks_hostUserId_fk', ['hostUserId'], {})
@Entity('meetingLinks')
export class MeetingLink {
    @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
        id: number;

    @Column('varchar', { name: 'token', length: 64, unique: true })
        token: string;

    @Column('varchar', { name: 'roomName', length: 100, unique: true })
        roomName: string;

    @Column('int', { name: 'hostUserId' })
        hostUserId: number;

    @Column('varchar', { name: 'title', length: 250, nullable: true })
        title: string | null;

    @Column('timestamp', { name: 'expiresAt', nullable: true })
        expiresAt: Date | null;

    @Column('timestamp', { name: 'revokedAt', nullable: true })
        revokedAt: Date | null;

    @CreateDateColumn({ name: 'createdAt' })
        createdAt: Date;

    @ManyToOne(() => Users, { eager: true })
    @JoinColumn([{ name: 'hostUserId', referencedColumnName: 'id' }])
        host: Users;
}
