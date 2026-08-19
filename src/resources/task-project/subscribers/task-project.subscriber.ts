import { DataSource, EntitySubscriberInterface, EventSubscriber } from 'typeorm';
import { Logger } from '@nestjs/common';
import { TaskProject } from '../entities/task-project.entity';
import { InsertEvent } from 'typeorm/subscriber/event/InsertEvent';
import { ProjectPhasesRelation } from '../entities/project-phases-relation.entity';

@EventSubscriber()
export class TaskProjectSubscriber implements EntitySubscriberInterface<TaskProject>{
    private readonly logger = new Logger(TaskProjectSubscriber.name);
    constructor (dataSource: DataSource) {
        dataSource.subscribers.push(this);
    }
    listenTo () {
        return TaskProject;
    }
    async afterInsert (event: InsertEvent<TaskProject>): Promise<void> {
        try {
            const entityManager = event.manager;
            const entity = event.entity;

            const projectPhasesRelationData = entity.phases.map((phase, index) => {
                return {
                    projectId: entity.id,
                    phaseId: phase.id,
                    orderId: index + 1
                };
            });
            const projectPhasesRelationEntity = projectPhasesRelationData.map(
                (entity) => {
                    return Object.assign(new ProjectPhasesRelation({}), entity);
                }
            );
            await entityManager.save(projectPhasesRelationEntity);
        } catch (e) {
            this.logger.error(`afterInsert: ${e.message}`);
        }
    }
}
