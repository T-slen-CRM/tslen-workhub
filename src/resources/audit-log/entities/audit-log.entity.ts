import { Column, CreateDateColumn, Entity, Index } from 'typeorm';
import { BaseAbstractEntity } from '../../../common/entities/base/base.abstract.entity';

@Entity('audit_logs')
export class AuditLog extends BaseAbstractEntity<AuditLog> {
    constructor (entity: Partial<AuditLog>) {
        super(entity);
    }

    @Index()
    @Column('int', { name: 'userId', nullable: true })
        userId: number | null;

    @Index()
    @Column('varchar', { name: 'ip', length: 64 })
        ip: string;

    @Column('varchar', { name: 'userAgent', nullable: true, length: 500 })
        userAgent: string | null;

    @Column('varchar', { name: 'method', length: 10 })
        method: string;

    @Column('varchar', { name: 'route', length: 500 })
        route: string;

    @Column('varchar', { name: 'resourceType', nullable: true, length: 255 })
        resourceType: string | null;

    @Column('varchar', { name: 'resourceId', nullable: true, length: 255 })
        resourceId: string | null;

    @Column('int', { name: 'statusCode' })
        statusCode: number;

    @Column('jsonb', { name: 'requestBody', nullable: true })
        requestBody: Record<string, unknown> | null;

    @Index()
    @CreateDateColumn({ name: 'createdAt' })
        createdAt: Date;
}
