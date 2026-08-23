import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { TaskPhaseRepository } from '../task-phase/task-phase.repository';
import { TaskProjectRepository } from '../task-project/task-project.repository';

type FieldResolver = (id: number) => Promise<string | null>;

@Injectable()
export class AuditLogLabelResolverService {
    private readonly resolvers: Record<string, FieldResolver>;

    constructor (
        private readonly usersRepository: UsersRepository,
        private readonly taskPhaseRepository: TaskPhaseRepository,
        private readonly taskProjectRepository: TaskProjectRepository,
    ) {
        this.resolvers = {
            userId: (id) => this.usersRepository.findOne(id).then((u) => (u ? `${u.firstName} ${u.lastName}` : null)),
            phaseId: (id) => this.taskPhaseRepository.findOne(id).then((p) => p?.name ?? null),
            projectId: (id) => this.taskProjectRepository.findOne(id).then((p) => p?.name ?? null),
        };
    }

    async resolveLabel (field: string, value: unknown): Promise<string | null> {
        const resolver = this.resolvers[field];
        if (!resolver || typeof value !== 'number') {
            return null;
        }
        try {
            return await resolver(value);
        } catch {
            return null;
        }
    }
}
