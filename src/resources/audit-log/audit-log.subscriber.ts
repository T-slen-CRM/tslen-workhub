import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent, DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { pushAuditChange, AuditEntityChange } from '../../common/audit-context.storage';
import { computeFieldDiff, pickColumns } from './audit-log-diff.util';
import { AuditLogLabelResolverService } from './audit-log-label-resolver.service';

@EventSubscriber()
export class AuditLogSubscriber implements EntitySubscriberInterface {
    private readonly logger = new Logger(AuditLogSubscriber.name);

    constructor (
        dataSource: DataSource,
        private readonly labelResolverService: AuditLogLabelResolverService,
    ) {
        dataSource.subscribers.push(this);
    }

    async afterInsert (event: InsertEvent<any>): Promise<void> {
        const columnNames = event.metadata.columns.map((c) => c.propertyName);
        await this.capture(event.metadata.name, pickColumns(event.entity, columnNames), undefined, 'insert');
    }

    async afterUpdate (event: UpdateEvent<any>): Promise<void> {
        const columnNames = event.metadata.columns.map((c) => c.propertyName);
        await this.capture(event.metadata.name, pickColumns(event.entity, columnNames), pickColumns(event.databaseEntity, columnNames), 'update');
    }

    async beforeRemove (event: RemoveEvent<any>): Promise<void> {
        const columnNames = event.metadata.columns.map((c) => c.propertyName);
        await this.capture(event.metadata.name, undefined, pickColumns(event.databaseEntity, columnNames), 'delete');
    }

    private async capture (
        entityName: string,
        newValues: Record<string, unknown> | undefined,
        oldValues: Record<string, unknown> | undefined,
        action: AuditEntityChange['action']
    ): Promise<void> {
        try {
            const raw = computeFieldDiff(newValues, oldValues);
            if (raw.length === 0) {
                return;
            }
            const entityId = ((newValues?.id ?? oldValues?.id) as number | string);
            const fields = await Promise.all(raw.map(async (d) => ({
                field: d.field,
                ...('from' in d ? { from: d.from, fromLabel: await this.labelResolverService.resolveLabel(d.field, d.from) } : {}),
                ...('to' in d ? { to: d.to, toLabel: await this.labelResolverService.resolveLabel(d.field, d.to) } : {}),
            })));
            pushAuditChange({ entityName, entityId, action, fields });
        } catch (e) {
            this.logger.error(`Failed to capture audit diff for ${entityName}: ${e.message}`);
        }
    }
}
