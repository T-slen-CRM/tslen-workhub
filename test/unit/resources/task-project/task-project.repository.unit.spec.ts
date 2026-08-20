import { TestBed } from '@automock/jest';
import { mockUser } from '../../../shared/users';
import { TaskProjectRepository } from '../../../../src/resources/task-project/task-project.repository';
import { TaskProject } from '../../../../src/resources/task-project/entities/task-project.entity';
import { mockedTaskProject } from '../../../shared/task-project';
import { CreateTaskProjectDto } from '../../../../src/resources/task-project/dto/create-task-project.dto';

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
});
