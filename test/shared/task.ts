import { CreateTaskDto } from 'src/resources/tasks/dto/create-task.dto';
import { CreateTaskPhaseDto } from 'src/resources/task-phase/dto/create-task-phase.dto';
import { CreateTaskProjectDto } from 'src/resources/task-project/dto/create-task-project.dto';
import { OrderInPhaseDto } from 'src/resources/task-phase/dto/orderInPhase.dto';

const date = '2021-09-01T00:00:00.000Z';
export const mockedTask: CreateTaskDto = {
    id: 1,
    title: 'test',
    description: 'test',
    createdAt: new Date(date),
    updatedAt: new Date(date),
    orderId: 1,
    actorUserId: null,
    status: 'unStatus',
    priority: 'test',
    estimate: new Date(date),
    createdBy: 'test',
    label: 'test',
    assignessEmail: 'test',
    phaseId: 1,
    projectId: 1,
    phases: {} as CreateTaskPhaseDto,
    project: {} as CreateTaskProjectDto,
    taskAttachments: [],
    orderInPhases: {} as OrderInPhaseDto,
    taskUserAssignmentRelations: [],
    createdByName: 'test',
}
