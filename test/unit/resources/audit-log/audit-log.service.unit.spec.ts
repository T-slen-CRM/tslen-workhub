import { TestBed } from '@automock/jest';
import { AuditLogService } from '../../../../src/resources/audit-log/audit-log.service';
import { AuditLogRepository } from '../../../../src/resources/audit-log/audit-log.repository';
import { AuditLog } from '../../../../src/resources/audit-log/entities/audit-log.entity';
import { UsersRepository } from '../../../../src/resources/users/users.repository';
import { Users } from '../../../../src/resources/users/entities/users.entity';

describe('AuditLogService', () => {
    it('findRecent delegates to the repository with a 30-day / 1000-row bound, and no filters by default', async () => {
        const { unit, unitRef } = TestBed.create(AuditLogService).compile();
        const repository = unitRef.get(AuditLogRepository);
        const rows = [{ id: 1 }] as AuditLog[];
        repository.findRecent.mockResolvedValue(rows);

        const result = await unit.findRecent();

        expect(repository.findRecent).toHaveBeenCalledWith(30, 1000, {});
        expect(result).toBe(rows);
    });

    it('passes userIds/resourceTypes filters through to the repository', async () => {
        const { unit, unitRef } = TestBed.create(AuditLogService).compile();
        const repository = unitRef.get(AuditLogRepository);
        repository.findRecent.mockResolvedValue([]);

        await unit.findRecent({ userIds: [3, 5], resourceTypes: ['Tasks'] });

        expect(repository.findRecent).toHaveBeenCalledWith(30, 1000, { userIds: [3, 5], resourceTypes: ['Tasks'] });
    });

    describe('findTaskHistory', () => {
        function setup () {
            const { unit, unitRef } = TestBed.create(AuditLogService).compile();
            const repository = unitRef.get(AuditLogRepository);
            const usersRepository = unitRef.get(UsersRepository);
            return { unit, repository, usersRepository };
        }

        it('flattens a Tasks change into one entry per field, resolving the actor', async () => {
            const { unit, repository, usersRepository } = setup();
            const row = {
                id: 10,
                userId: 9,
                createdAt: new Date('2026-08-17T10:00:00.000Z'),
                changes: [
                    {
                        entityName: 'Tasks',
                        entityId: 7,
                        action: 'update',
                        fields: [
                            { field: 'title', from: 'Old', to: 'New' },
                            { field: 'phaseId', from: 1, fromLabel: 'To Do', to: 2, toLabel: 'In Progress' },
                        ],
                    },
                ],
            } as unknown as AuditLog;
            repository.findEntityChanges.mockResolvedValue([row]);
            usersRepository.findOne.mockResolvedValue({ id: 9, firstName: 'Jane', lastName: 'Doe' } as Users);

            const result = await unit.findTaskHistory(7);

            expect(repository.findEntityChanges).toHaveBeenCalledWith('Tasks', 7);
            expect(result).toEqual([
                {
                    id: '10:title', createdAt: row.createdAt, action: 'update', field: 'title',
                    from: 'Old', fromLabel: null, to: 'New', toLabel: null,
                    user: { id: 9, firstName: 'Jane', lastName: 'Doe' },
                },
                {
                    id: '10:phaseId', createdAt: row.createdAt, action: 'update', field: 'phaseId',
                    from: 1, fromLabel: 'To Do', to: 2, toLabel: 'In Progress',
                    user: { id: 9, firstName: 'Jane', lastName: 'Doe' },
                },
            ]);
        });

        it('ignores a change entry for a different entity or task id in the same row', async () => {
            const { unit, repository, usersRepository } = setup();
            const row = {
                id: 11,
                userId: null,
                createdAt: new Date('2026-08-17T11:00:00.000Z'),
                changes: [
                    { entityName: 'Notification', entityId: 1, action: 'insert', fields: [{ field: 'read', to: false }] },
                    { entityName: 'Tasks', entityId: 999, action: 'update', fields: [{ field: 'title', to: 'Other task' }] },
                ],
            } as unknown as AuditLog;
            repository.findEntityChanges.mockResolvedValue([row]);

            const result = await unit.findTaskHistory(7);

            expect(result).toEqual([]);
            expect(usersRepository.findOne).not.toHaveBeenCalled();
        });

        it('leaves user null when the row has no actor, without looking one up', async () => {
            const { unit, repository, usersRepository } = setup();
            const row = {
                id: 12,
                userId: null,
                createdAt: new Date('2026-08-17T12:00:00.000Z'),
                changes: [{ entityName: 'Tasks', entityId: 7, action: 'update', fields: [{ field: 'title', to: 'New' }] }],
            } as unknown as AuditLog;
            repository.findEntityChanges.mockResolvedValue([row]);

            const result = await unit.findTaskHistory(7);

            expect(result[0].user).toBeNull();
            expect(usersRepository.findOne).not.toHaveBeenCalled();
        });

        it('resolves the same actor only once across multiple rows', async () => {
            const { unit, repository, usersRepository } = setup();
            const rows = [
                {
                    id: 13, userId: 9, createdAt: new Date('2026-08-17T13:00:00.000Z'),
                    changes: [{ entityName: 'Tasks', entityId: 7, action: 'update', fields: [{ field: 'title', to: 'A' }] }],
                },
                {
                    id: 14, userId: 9, createdAt: new Date('2026-08-17T14:00:00.000Z'),
                    changes: [{ entityName: 'Tasks', entityId: 7, action: 'update', fields: [{ field: 'title', to: 'B' }] }],
                },
            ] as unknown as AuditLog[];
            repository.findEntityChanges.mockResolvedValue(rows);
            usersRepository.findOne.mockResolvedValue({ id: 9, firstName: 'Jane', lastName: 'Doe' } as Users);

            await unit.findTaskHistory(7);

            expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
        });
    });
});
