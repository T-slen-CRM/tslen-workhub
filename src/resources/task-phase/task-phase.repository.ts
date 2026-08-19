import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskPhase } from './entities/task-phase.entity';

export class TaskPhaseRepository extends BaseAbstractRepository<TaskPhase>{
    constructor (
    @InjectRepository(TaskPhase)
    private readonly taskPhaseRepository: Repository<TaskPhase>
    ) {
        super(taskPhaseRepository);
    }
    async getByRole (): Promise<TaskPhase[]>{
        return await this.taskPhaseRepository.find({
            relations: [
                'tasks'
            ],
            order: {
                tasks: {
                    orderId: 'ASC'
                }
            }
        });

    }
}
