import { Repository } from 'typeorm';
import { TestBed } from '@automock/jest';
import { mockUser } from '../../../shared/users';
import { TaskProjectRepository } from '../../../../src/resources/task-project/task-project.repository';
import { TaskProject } from '../../../../src/resources/task-project/entities/task-project.entity';
import { mockedTaskProject } from '../../../shared/task-project';
import { CreateTaskProjectDto } from '../../../../src/resources/task-project/dto/create-task-project.dto';
import { activeUserCondition } from '../../../../src/resources/users/utils/active-user-condition.util';

/**
 * Minimal chainable stand-in for TypeORM's SelectQueryBuilder, recording
 * calls so tests can assert on leftJoinAndSelect/andWhere arguments
 * without a real DB.
 */
function createFakeQueryBuilder (result: unknown) {
    const calls: { method: string; args: unknown[] }[] = [];
    const qb: Record<string, (...args: unknown[]) => unknown> = {};
    ['leftJoinAndSelect', 'where', 'andWhere', 'orderBy'].forEach((method) => {
        qb[method] = (...args: unknown[]) => { calls.push({ method, args }); return qb; };
    });
    qb.getMany = async () => result;
    qb.getOne = async () => result;
    return { qb, calls };
}

describe('TaskProjectRepository', () => {
    let repository: TaskProjectRepository;
    beforeEach(async () => {
        const { unit } = TestBed.create(TaskProjectRepository).compile();
        repository = unit;
    });
    it('should be defined', () => {
        expect(repository).toBeDefined();
    });
    it('should call getOneWithRelations', async () => {
        const mockResponse: Partial<CreateTaskProjectDto> = mockedTaskProject;
        jest.spyOn(repository, 'getOneWithRelations').mockResolvedValue(mockedTaskProject as unknown as TaskProject);
        const result = await repository.getOneWithRelations(1, mockUser);
        expect(repository.getOneWithRelations).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('should call getByRole', async () => {
        const mockResponse: Partial<CreateTaskProjectDto>[] = [mockedTaskProject];
        jest.spyOn(repository, 'getByRole').mockResolvedValue([mockedTaskProject] as unknown as TaskProject[]);
        const result = await repository.getByRole(mockUser);
        expect(repository.getByRole).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('should call findByPhaseId', async () => {
        jest.spyOn(repository, 'findByPhaseId').mockResolvedValue(mockedTaskProject as unknown as TaskProject);
        const result = await repository.findByPhaseId(5);
        expect(repository.findByPhaseId).toHaveBeenCalledWith(5);
        expect(result).toEqual(mockedTaskProject);
    });
    it('should call findAllWithPhases', async () => {
        const mockResponse = [{ id: 1, name: 'test', phases: [{ id: 5, name: 'ToDo' }] }];
        jest.spyOn(repository, 'findAllWithPhases').mockResolvedValue(mockResponse);
        const result = await repository.findAllWithPhases();
        expect(repository.findAllWithPhases).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });

    describe('excludes inactive/fired users from embedded permission/assignee lists', () => {
        it('getByRole scopes the taskProjectPermission.user join to active users', async () => {
            const { qb, calls } = createFakeQueryBuilder([]);
            const fakeRepository = { createQueryBuilder: () => qb } as unknown as Repository<TaskProject>;
            const testRepository = new TaskProjectRepository(fakeRepository);

            await testRepository.getByRole(mockUser);

            const userJoin = calls.find((c) => c.method === 'leftJoinAndSelect' && c.args[1] === 'user');
            expect(userJoin.args[2]).toBe(activeUserCondition('user'));
        });

        it('getOneWithRelations scopes both the permission and assignee user joins to active users', async () => {
            const { qb, calls } = createFakeQueryBuilder(mockedTaskProject);
            const fakeRepository = { createQueryBuilder: () => qb } as unknown as Repository<TaskProject>;
            const testRepository = new TaskProjectRepository(fakeRepository);

            await testRepository.getOneWithRelations(1, mockUser);

            const userJoin = calls.find((c) => c.method === 'leftJoinAndSelect' && c.args[1] === 'user');
            const assignmentUserJoin = calls.find((c) => c.method === 'leftJoinAndSelect' && c.args[1] === 'assignmentUser');
            expect(userJoin.args[2]).toBe(activeUserCondition('user'));
            expect(assignmentUserJoin.args[2]).toBe(activeUserCondition('assignmentUser'));
        });
    });
});
