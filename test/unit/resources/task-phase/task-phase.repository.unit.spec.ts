import { TestBed } from '@automock/jest';
import { TaskPhaseRepository } from '../../../../src/resources/task-phase/task-phase.repository';

describe('TaskPhaseRepository', () => {
    let repository: TaskPhaseRepository;
    beforeEach(async () => {
        const { unit } = TestBed.create(TaskPhaseRepository).compile();
        repository = unit;
    });
    it('should be defined', () => {
        expect(repository).toBeDefined();
    });
});
