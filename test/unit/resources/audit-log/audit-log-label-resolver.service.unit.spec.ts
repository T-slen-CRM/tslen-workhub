import { TestBed } from '@automock/jest';
import { AuditLogLabelResolverService } from '../../../../src/resources/audit-log/audit-log-label-resolver.service';
import { UsersRepository } from '../../../../src/resources/users/users.repository';
import { TaskPhaseRepository } from '../../../../src/resources/task-phase/task-phase.repository';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { TaskPhase } from '../../../../src/resources/task-phase/entities/task-phase.entity';

describe('AuditLogLabelResolverService', () => {
    let service: AuditLogLabelResolverService;
    let usersRepository: jest.Mocked<UsersRepository>;
    let taskPhaseRepository: jest.Mocked<TaskPhaseRepository>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(AuditLogLabelResolverService).compile();
        service = unit;
        usersRepository = unitRef.get(UsersRepository);
        taskPhaseRepository = unitRef.get(TaskPhaseRepository);
    });

    it('resolves a userId to "First Last"', async () => {
        usersRepository.findOne.mockResolvedValue({ firstName: 'John', lastName: 'Smith' } as Users);

        expect(await service.resolveLabel('userId', 12)).toBe('John Smith');
        expect(usersRepository.findOne).toHaveBeenCalledWith(12);
    });

    it('resolves a phaseId to the phase name', async () => {
        taskPhaseRepository.findOne.mockResolvedValue({ name: 'In progress' } as TaskPhase);

        expect(await service.resolveLabel('phaseId', 22)).toBe('In progress');
    });

    it('returns null for a field with no configured resolver, without calling any repository', async () => {
        expect(await service.resolveLabel('title', 'anything')).toBeNull();
        expect(usersRepository.findOne).not.toHaveBeenCalled();
    });

    it('returns null for a non-numeric value', async () => {
        expect(await service.resolveLabel('userId', 'not-a-number')).toBeNull();
    });

    it('returns null when the referenced row no longer exists', async () => {
        usersRepository.findOne.mockResolvedValue(null);

        expect(await service.resolveLabel('userId', 999)).toBeNull();
    });

    it('returns null instead of throwing when the repository lookup fails', async () => {
        usersRepository.findOne.mockRejectedValue(new Error('db down'));

        await expect(service.resolveLabel('userId', 12)).resolves.toBeNull();
    });
});
