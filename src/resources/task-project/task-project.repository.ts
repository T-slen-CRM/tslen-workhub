import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskProject } from './entities/task-project.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';

export class TaskProjectRepository extends BaseAbstractRepository<TaskProject>{
    constructor (
    @InjectRepository(TaskProject)
    private readonly taskProjectRepository: Repository<TaskProject>
    ) {
        super(taskProjectRepository);
    }
    public async getByRole (user: CreateUserDto): Promise<TaskProject[]>{
        const companyId = user.companyId;
        const userId = user.id;
        const qb = this.taskProjectRepository.createQueryBuilder('taskProject')
            .leftJoinAndSelect('taskProject.taskProjectPermissions', 'taskProjectPermission')
            .leftJoinAndSelect('taskProjectPermission.user', 'user')
            .andWhere(`taskProject.companyId = ${companyId}`)
            .andWhere(qb => {
                const subQuery = qb
                    .subQuery()
                    .select('1')
                    .from('taskProjectPermission', 'taskProjectPermission')
                    .where('taskProjectPermission.projectId = taskProject.id')
                    .andWhere(`taskProjectPermission.userId = ${userId}`)
                    .getQuery();
                return `EXISTS ${subQuery}`;
            });

        return await qb.getMany();
    }
    async getOneWithRelations (id: number, user: CreateUserDto) {
        const companyId: number = user.companyId;
        const userId: number = user.id;
        // return await this.taskProjectRepository.findOneOrFail({
        //     where: {
        //         id: id,
        //         companyId: companyId,
        //         projectPhasesRelations: {
        //             phase: {
        //                 tasks: {
        //                     projectId: id
        //                 }
        //             }
        //         }
        //     },
        //     relations: [
        //         'taskProjectPermissions',
        //         'projectPhasesRelations',
        //         'projectPhasesRelations.phase',
        //         'projectPhasesRelations.phase.tasks',
        //         'projectPhasesRelations.phase.tasks.taskUserAssignmentRelations',
        //     ],
        //     // order: {
        //     //     tasks: {
        //     //         orderId: 'ASC'
        //     //     }
        //     // }
        // })
        // TODO: use query builder
        const qb = this.taskProjectRepository.createQueryBuilder('taskProject')
            .leftJoinAndSelect('taskProject.taskProjectPermissions', 'taskProjectPermission')
            .leftJoinAndSelect('taskProjectPermission.user', 'user')
            .leftJoinAndSelect('taskProject.projectPhasesRelations', 'projectPhasesRelation')
            .leftJoinAndSelect('projectPhasesRelation.phase', 'phase')
            .leftJoinAndSelect('phase.tasks', 'task', 'task.projectId = taskProject.id')
            .leftJoinAndSelect('task.taskUserAssignmentRelations', 'taskUserAssignmentRelation')
            .leftJoinAndSelect('taskUserAssignmentRelation.user', 'assignmentUser')
            .leftJoinAndSelect('task.taskAttachments', 'taskAttachments')
            .where('taskProject.id = :id', { id })
            .andWhere('taskProject.companyId = :companyId', { companyId })
            .andWhere(qb => {
                const subQuery = qb
                    .subQuery()
                    .select('1')
                    .from('taskProjectPermission', 'taskProjectPermission')
                    .where('taskProjectPermission.projectId = taskProject.id')
                    .andWhere(`taskProjectPermission.userId = ${userId}`)
                    .getQuery();
                return `EXISTS ${subQuery}`;
            })
            .orderBy('projectPhasesRelation.orderId', 'ASC'); // Add this line to order by orderId
        return await qb.getOne();
    }
}
