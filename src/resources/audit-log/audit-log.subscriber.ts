import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent, DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { pushAuditChange, AuditEntityChange, AuditFieldChange } from '../../common/audit-context.storage';
import { computeFieldDiff, diffAssigneeUserId } from './audit-log-diff.util';
import { AuditLogLabelResolverService } from './audit-log-label-resolver.service';

const SUPPRESSED_ENTITY_NAMES = new Set(['TaskUserAssignmentRelation']);

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
        await this.capture(event.metadata.name, event.entity, undefined, 'insert');
    }

    async afterUpdate (event: UpdateEvent<any>): Promise<void> {
        await this.capture(event.metadata.name, event.entity, event.databaseEntity, 'update');
    }

    async beforeRemove (event: RemoveEvent<any>): Promise<void> {
        await this.capture(event.metadata.name, undefined, event.databaseEntity, 'delete');
    }

    private async capture (
        entityName: string,
        newValues: Record<string, unknown> | undefined,
        oldValues: Record<string, unknown> | undefined,
        action: AuditEntityChange['action']
    ): Promise<void> {
        // TaskUserAssignmentRelation's own insert/delete events are unreliable
        // for reporting assignee changes: TypeORM's orphan-removal cascade for
        // an eager @OneToMany relation runs as a raw bulk DELETE, which never
        // fires beforeRemove. Assignee changes are captured directly from
        // Tasks' own eager relation array below instead - suppress this
        // entity's raw (and incomplete) events entirely to avoid duplicates.
        if (SUPPRESSED_ENTITY_NAMES.has(entityName)) {
            return;
        }
        try {
            let raw = computeFieldDiff(newValues, oldValues);
            const fields: AuditFieldChange[] = [];

            if (entityName === 'Tasks') {
                raw = raw.filter((d) => d.field !== 'taskUserAssignmentRelations');
                const assigneeDiff = diffAssigneeUserId(
                    newValues?.taskUserAssignmentRelations as { userId?: number }[] | undefined,
                    oldValues?.taskUserAssignmentRelations as { userId?: number }[] | undefined
                );
                if (assigneeDiff) {
                    fields.push({
                        field: 'assignee',
                        ...('from' in assigneeDiff ? { from: assigneeDiff.from, fromLabel: await this.labelResolverService.resolveLabel('userId', assigneeDiff.from) } : {}),
                        ...('to' in assigneeDiff ? { to: assigneeDiff.to, toLabel: await this.labelResolverService.resolveLabel('userId', assigneeDiff.to) } : {}),
                    });
                }
            }

            for (const d of raw) {
                fields.push({
                    field: d.field,
                    ...('from' in d ? { from: d.from, fromLabel: await this.labelResolverService.resolveLabel(d.field, d.from) } : {}),
                    ...('to' in d ? { to: d.to, toLabel: await this.labelResolverService.resolveLabel(d.field, d.to) } : {}),
                });
            }

            if (fields.length === 0) {
                return;
            }
            const entityId = ((newValues?.id ?? oldValues?.id) as number | string);
            pushAuditChange({ entityName, entityId, action, fields });
        } catch (e) {
            this.logger.error(`Failed to capture audit diff for ${entityName}: ${e.message}`);
        }
    }
}
