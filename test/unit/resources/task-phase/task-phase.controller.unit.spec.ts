import { TaskPhaseController } from '../../../../src/resources/task-phase/task-phase.controller';
import { TestBed } from '@automock/jest';
import { mockedTaskPhase } from '../../../shared/task-phase';
import { mockUser } from '../../../shared/users';
import { TaskPhase } from '../../../../src/resources/task-phase/entities/task-phase.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';

describe('TaskPhaseController', () => {
    let controller: TaskPhaseController;

    beforeEach(async () => {
        const { unit } = TestBed.create(TaskPhaseController).compile();
        controller = unit;
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
    it('should call taskPhaseService.create', async () => {
        jest.spyOn(controller, 'create').mockResolvedValue(mockedTaskPhase as unknown as TaskPhase);
        const result = await controller.create(mockedTaskPhase);
        expect(controller.create).toHaveBeenCalled();
        expect(result).toEqual(mockedTaskPhase);
    });
    it('should call taskPhaseService.findAll', async () => {
        jest.spyOn(controller, 'findAll').mockResolvedValue([mockedTaskPhase] as unknown as TaskPhase[]);
        const result = await controller.findAll(mockUser as unknown as Users);
        expect(controller.findAll).toHaveBeenCalled();
        expect(result).toEqual([mockedTaskPhase]);
    });
    it('should call taskPhaseService.update', async () => {
        jest.spyOn(controller, 'update').mockResolvedValue(mockedTaskPhase as unknown as TaskPhase);
        const result = await controller.update(1, mockedTaskPhase);
        expect(controller.update).toHaveBeenCalled();
        expect(result).toEqual(mockedTaskPhase);
    });
    it('should call taskPhaseService.delete', async () => {
        jest.spyOn(controller, 'remove').mockResolvedValue({ affected: 1, raw: [] });
        const result = await controller.remove(1);
        expect(controller.remove).toHaveBeenCalled();
        expect(result).toEqual({ affected: 1, raw: [] });
    });
});
