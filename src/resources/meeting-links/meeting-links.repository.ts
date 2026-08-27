import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingLink } from './entities/meeting-link.entity';

export class MeetingLinksRepository extends BaseAbstractRepository<MeetingLink> {
    constructor (
        @InjectRepository(MeetingLink)
        private readonly meetingLinksRepository: Repository<MeetingLink>
    ) {
        super(meetingLinksRepository);
    }

    findAllForHost (hostUserId: number): Promise<MeetingLink[]> {
        return this.meetingLinksRepository.find({
            where: { hostUserId },
            order: { createdAt: 'DESC' },
        });
    }

    findByTokenHash (hash: string): Promise<MeetingLink> {
        return this.meetingLinksRepository.findOne({ where: { token: hash } });
    }
}
