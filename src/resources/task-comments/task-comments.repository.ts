import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { TaskComment } from '../tasks/entities/task-comment.entity';

export class TaskCommentsRepository extends BaseAbstractRepository<TaskComment> {
    constructor (
        @InjectRepository(TaskComment)
        private readonly taskCommentsRepository: Repository<TaskComment>,
        private readonly entityManager: EntityManager
    ) {
        super(taskCommentsRepository);
    }

    findByTaskId (taskId: number): Promise<TaskComment[]> {
        return this.taskCommentsRepository.find({
            where: { taskId },
            order: { createdAt: 'ASC' },
        });
    }

    async createOneWithRelations (data: Partial<TaskComment>): Promise<TaskComment> {
        return this.entityManager.transaction(async (transactionalEntityManager) => {
            const saved = await transactionalEntityManager.save(TaskComment, data);
            return transactionalEntityManager.findOne(TaskComment, { where: { id: saved.id } });
        });
    }
}
