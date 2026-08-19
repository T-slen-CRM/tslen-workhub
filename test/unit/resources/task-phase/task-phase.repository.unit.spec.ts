import { TestBed } from '@automock/jest';
import { TaskPhaseRepository } from '../../../../src/resources/task-phase/task-phase.repository';
import { TaskPhase } from '../../../../src/resources/task-phase/entities/task-phase.entity';

describe('TaskPhaseRepository', () => {
    let repository: TaskPhaseRepository;
    beforeEach(async () => {
        const { unit } = TestBed.create(TaskPhaseRepository).compile();
        repository = unit;
    });
    it('should be defined', () => {
        expect(repository).toBeDefined();
    });

    describe('findByIdWithProject', () => {
        it('loads the taskProject relation', async () => {
            const phase = { id: 5, taskProject: { id: 9 } } as TaskPhase;
            const findOneSpy = jest.spyOn(repository['taskPhaseRepository'], 'findOne').mockResolvedValue(phase);

            const result = await repository.findByIdWithProject(5);

            expect(findOneSpy).toHaveBeenCalledWith({ where: { id: 5 }, relations: ['taskProject'] });
            expect(result).toBe(phase);
        });
    });
});
