import { CreateTaskProjectDto } from 'src/resources/task-project/dto/create-task-project.dto';

export const  mockedTaskProject: CreateTaskProjectDto = {
    id: 1,
    name: 'test',
    description: 'test',
    createdAt: new Date(),
    taskProjectPermissions: [],
    tasks: [],
    projectPhasesRelations: [],
    slackChannel: 'test',
    isPrivate: 1,
    deletedAt: new Date(),
    logo: 'test',
    companyId: 1,
    phases: []
}
