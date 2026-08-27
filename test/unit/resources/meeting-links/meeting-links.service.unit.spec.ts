import { TestBed } from '@automock/jest';
import { GoneException, NotFoundException } from '@nestjs/common';
import { MeetingLinksService } from '../../../../src/resources/meeting-links/meeting-links.service';
import { MeetingLinksRepository } from '../../../../src/resources/meeting-links/meeting-links.repository';
import { MeetingLink } from '../../../../src/resources/meeting-links/entities/meeting-link.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { hashApiToken } from '../../../../src/resources/api-tokens/utils/hash-token';

describe('MeetingLinksService', () => {
    let service: MeetingLinksService;
    let repository: jest.Mocked<MeetingLinksRepository>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(MeetingLinksService).compile();
        service = unit;
        repository = unitRef.get(MeetingLinksRepository);
    });

    describe('createLink', () => {
        it('stores a hashed token and a unique roomName, and returns the plaintext token once', async () => {
            const host = { id: 7 } as Users;
            repository.create.mockImplementation(async (data: Partial<MeetingLink>) => ({ ...data, id: 1 } as MeetingLink));

            const result = await service.createLink(host, { title: 'Standup' });

            const [savedData] = repository.create.mock.calls[0];
            expect(savedData.token).toBe(hashApiToken(result.token));
            expect(savedData.token).not.toBe(result.token);
            expect(savedData.hostUserId).toBe(7);
            expect(savedData.roomName).toMatch(/^meeting-/);
            expect(savedData.title).toBe('Standup');
            expect(result.token).toMatch(/^[0-9a-f]{64}$/);
        });

        it('defaults title to null and expiresAt to null when not given', async () => {
            const host = { id: 7 } as Users;
            repository.create.mockImplementation(async (data: Partial<MeetingLink>) => ({ ...data, id: 1 } as MeetingLink));

            await service.createLink(host, {});

            const [savedData] = repository.create.mock.calls[0];
            expect(savedData.title).toBeNull();
            expect(savedData.expiresAt).toBeNull();
        });
    });

    describe('findAllForHost', () => {
        it('delegates to the repository, keyed by hostUserId', async () => {
            const rows = [{
                id: 1, title: 'Standup', roomName: 'meeting-abc', expiresAt: null, revokedAt: null, createdAt: new Date(),
            }] as MeetingLink[];
            repository.findAllForHost.mockResolvedValue(rows);

            const result = await service.findAllForHost(7);

            expect(repository.findAllForHost).toHaveBeenCalledWith(7);
            expect(result).toEqual([{
                id: 1, title: 'Standup', roomName: 'meeting-abc', expiresAt: null, revokedAt: null, createdAt: rows[0].createdAt,
            }]);
        });

        it('never includes the stored token hash or the eager host relation (which carries the password hash)', async () => {
            const rows = [{
                id: 1,
                title: 'Standup',
                roomName: 'meeting-abc',
                expiresAt: null,
                revokedAt: null,
                createdAt: new Date(),
                token: 'deadbeef'.repeat(8),
                hostUserId: 7,
                host: { id: 7, password: 'bcrypt-hash-should-never-leave-the-server' } as Users,
            }] as MeetingLink[];
            repository.findAllForHost.mockResolvedValue(rows);

            const result = await service.findAllForHost(7);

            expect(JSON.stringify(result)).not.toContain('bcrypt-hash-should-never-leave-the-server');
            expect(JSON.stringify(result)).not.toContain('deadbeef');
        });
    });

    describe('revoke', () => {
        it('sets revokedAt when the link belongs to the caller', async () => {
            const link = { id: 1, hostUserId: 7, revokedAt: null } as MeetingLink;
            repository.findOne.mockResolvedValue(link);

            await service.revoke(1, 7);

            expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ id: 1, revokedAt: expect.any(Date) }));
        });

        it('throws NotFoundException when the link is not owned by the caller', async () => {
            repository.findOne.mockResolvedValue({ id: 1, hostUserId: 999 } as MeetingLink);

            await expect(service.revoke(1, 7)).rejects.toThrow(NotFoundException);
        });

        it('throws NotFoundException when the link does not exist', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(service.revoke(1, 7)).rejects.toThrow(NotFoundException);
        });
    });

    describe('validateToken', () => {
        it('returns the link for a valid, active token', async () => {
            const link = { id: 1, token: hashApiToken('plain'), revokedAt: null, expiresAt: null } as MeetingLink;
            repository.findByTokenHash.mockResolvedValue(link);

            const result = await service.validateToken('plain');

            expect(repository.findByTokenHash).toHaveBeenCalledWith(hashApiToken('plain'));
            expect(result).toBe(link);
        });

        it('throws NotFoundException for an unknown token', async () => {
            repository.findByTokenHash.mockResolvedValue(null);

            await expect(service.validateToken('plain')).rejects.toThrow(NotFoundException);
        });

        it('throws GoneException for a revoked token', async () => {
            repository.findByTokenHash.mockResolvedValue({ id: 1, revokedAt: new Date(), expiresAt: null } as MeetingLink);

            await expect(service.validateToken('plain')).rejects.toThrow(GoneException);
        });

        it('throws GoneException for an expired token', async () => {
            repository.findByTokenHash.mockResolvedValue({ id: 1, revokedAt: null, expiresAt: new Date(Date.now() - 1000) } as MeetingLink);

            await expect(service.validateToken('plain')).rejects.toThrow(GoneException);
        });

        it('accepts a token with a future expiresAt', async () => {
            const link = { id: 1, revokedAt: null, expiresAt: new Date(Date.now() + 1000 * 60 * 60) } as MeetingLink;
            repository.findByTokenHash.mockResolvedValue(link);

            const result = await service.validateToken('plain');

            expect(result).toBe(link);
        });
    });
});
