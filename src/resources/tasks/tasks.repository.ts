import { Tasks } from './entities/task.entity';
import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CreateTaskDto } from './dto/create-task.dto';

export class TasksRepository extends BaseAbstractRepository<Tasks> {
    constructor (
    @InjectRepository(Tasks)
    private readonly tasksRepository: Repository<Tasks>,
    private readonly entityManager: EntityManager
    ) {
        super(tasksRepository);
    }
    async createOneWithRelations (creteTaskDto: CreateTaskDto): Promise<Tasks> {
        return await this.entityManager.transaction(async transactionalEntityManager => {
            const task =  await transactionalEntityManager.save(Tasks, creteTaskDto);
            return transactionalEntityManager.findOne(Tasks,{ where: { id: task.id } });
        });
    }
    async multiReordering (tasks: CreateTaskDto[]): Promise<Tasks[]> {
        return await this.tasksRepository.save(tasks);
    }
    async updateOneWithRelations (updateTaskDto: CreateTaskDto): Promise<Tasks> {
        return await this.entityManager.transaction(async transactionalEntityManager => {
            const task =  await transactionalEntityManager.save(Tasks, updateTaskDto);
            return transactionalEntityManager.findOne(Tasks,{ where: { id: task.id } });
        });
    }
    findAllFiltered (filters: { projectId?: number; phaseId?: number; status?: string }): Promise<Tasks[]> {
        const where: Record<string, number | string> = {};
        if (filters.projectId !== undefined) {
            where.projectId = filters.projectId;
        }
        if (filters.phaseId !== undefined) {
            where.phaseId = filters.phaseId;
        }
        if (filters.status !== undefined) {
            where.status = filters.status;
        }
        return this.tasksRepository.find({ where });
    }
}
