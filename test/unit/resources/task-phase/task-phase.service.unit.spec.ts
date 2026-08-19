import { TaskPhaseService } from '../../../../src/resources/task-phase/task-phase.service';
import { TestBed } from '@automock/jest';

describe('TaskPhaseService', () => {
    let service: TaskPhaseService;

    beforeEach(async () => {
        const { unit } = TestBed.create(TaskPhaseService).compile();
        service = unit;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
