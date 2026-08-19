import { TestBed } from '@automock/jest';
import { ExternalProjectsController } from '../../../../src/resources/external-tasks/external-projects.controller';
import { ExternalTasksService } from '../../../../src/resources/external-tasks/external-tasks.service';

describe('ExternalProjectsController', () => {
    let controller: ExternalProjectsController;
    let service: jest.Mocked<ExternalTasksService>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(ExternalProjectsController).compile();
        controller = unit;
        service = unitRef.get(ExternalTasksService);
    });

    describe('findAll', () => {
        it('delegates to ExternalTasksService.listProjects', async () => {
            const projects = [{ id: 7, name: 'Marketing', phases: [{ id: 14, name: 'ToDo' }] }];
            service.listProjects.mockResolvedValue(projects);

            const result = await controller.findAll();

            expect(service.listProjects).toHaveBeenCalled();
            expect(result).toBe(projects);
        });
    });
});
