import { GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { MeetingLinksRepository } from './meeting-links.repository';
import { MeetingLink } from './entities/meeting-link.entity';
import { Users } from '../users/entities/users.entity';
import { CreateMeetingLinkDto } from './dto/create-meeting-link.dto';
import { generateApiToken as generateOpaqueToken, hashApiToken as hashOpaqueToken } from '../api-tokens/utils/hash-token';

@Injectable()
export class MeetingLinksService extends BaseAbstractService<MeetingLink> {
    constructor (
        protected readonly repository: MeetingLinksRepository
    ) {
        super(repository, null);
        this.currentRepository = repository;
    }

    async createLink (host: Users, dto: CreateMeetingLinkDto): Promise<{ id: number; token: string; roomName: string; title: string | null; expiresAt: Date | null }> {
        const { plaintext, hash } = generateOpaqueToken();
        const roomName = `meeting-${randomUUID()}`;
        const saved = await this.repository.create({
            token: hash,
            hostUserId: host.id,
            roomName,
            title: dto.title ?? null,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        });
        return { id: saved.id, token: plaintext, roomName: saved.roomName, title: saved.title, expiresAt: saved.expiresAt };
    }

    async findAllForHost (hostUserId: number): Promise<{ id: number; title: string | null; roomName: string; expiresAt: Date | null; revokedAt: Date | null; createdAt: Date }[]> {
        const rows = await this.repository.findAllForHost(hostUserId);
        // Never expose the stored token hash or the eager `host` relation (which
        // carries the password hash) - same discipline as ApiTokensService.findAllForUser.
        return rows.map((row) => ({
            id: row.id,
            title: row.title,
            roomName: row.roomName,
            expiresAt: row.expiresAt,
            revokedAt: row.revokedAt,
            createdAt: row.createdAt,
        }));
    }

    async revoke (id: number, hostUserId: number): Promise<void> {
        const link = await this.repository.findOne(id);
        if (!link || link.hostUserId !== hostUserId) {
            throw new NotFoundException('Meeting link not found');
        }
        await this.repository.save({ ...link, revokedAt: new Date() });
    }

    async validateToken (token: string): Promise<MeetingLink> {
        const link = await this.repository.findByTokenHash(hashOpaqueToken(token));
        if (!link) {
            throw new NotFoundException('Meeting link not found');
        }
        if (link.revokedAt || (link.expiresAt && link.expiresAt.getTime() < Date.now())) {
            throw new GoneException('Meeting link is no longer valid');
        }
        return link;
    }
}
