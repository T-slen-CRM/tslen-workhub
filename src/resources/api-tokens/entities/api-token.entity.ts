import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Users } from '../../users/entities/users.entity';

@Index('apiTokens_users_id_fk', ['userId'], {})
@Entity('apiTokens')
export class ApiToken {
    @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
        id: number;

    @Column('varchar', { name: 'token', length: 64, unique: true })
        token: string;

    @Column('int', { name: 'userId' })
        userId: number;

    @Column('varchar', { name: 'name', length: 250 })
        name: string;

    @CreateDateColumn({ name: 'createdAt' })
        createdAt: Date;

    @Column('timestamp', { name: 'lastUsedAt', nullable: true })
        lastUsedAt: Date | null;

    @ManyToOne(() => Users, { eager: true })
    @JoinColumn([{ name: 'userId', referencedColumnName: 'id' }])
        user: Users;
}
