import { CreateTaskPhaseDto } from 'src/resources/task-phase/dto/create-task-phase.dto';

export const mockedTaskPhase: CreateTaskPhaseDto = {
    id: 1,
    name: 'test',
    createdAt: new Date(),
    deletedAt: new Date(),
    updatedAt: new Date(),
    orderInPhases: [],
    projectPhasesRelations: [],
    tasks: []

}
