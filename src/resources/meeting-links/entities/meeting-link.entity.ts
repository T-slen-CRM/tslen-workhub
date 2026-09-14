import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Users } from '../../users/entities/users.entity';

@Index('meetingLinks_hostUserId_fk', ['hostUserId'], {})
@Entity('meetingLinks')
export class MeetingLink {
    @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
        id: number;

    // Excluded from serialized responses (ClassSerializerInterceptor is
    // global, see main.ts) - same discipline as Users.password. This entity
    // is now reachable from GET /users/:id (via EventsByUser.meetingLink),
    // not just meeting-links' own hand-curated DTOs, so the lookup hash and
    // reversible ciphertext must never leave the server from that path.
    @Exclude()
    @Column('varchar', { name: 'token', length: 64, unique: true })
        token: string;

    // Reversible (AES-256-GCM) encryption of the plaintext token, kept
    // separately from the one-way-hashed `token` column above so hosts can
    // still see/copy a link they created earlier via GET /meeting-links -
    // `token` stays hash-based since it's the deterministic lookup key
    // MeetingGuestGuard queries by, and encryption is non-deterministic.
    @Exclude()
    @Column('varchar', { name: 'encryptedToken', length: 255 })
        encryptedToken: string;

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
