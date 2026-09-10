import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingBackgroundImage } from './entities/meeting-background-image.entity';

export class MeetingBackgroundImagesRepository extends BaseAbstractRepository<MeetingBackgroundImage> {
    constructor (
        @InjectRepository(MeetingBackgroundImage)
        private readonly meetingBackgroundImagesRepository: Repository<MeetingBackgroundImage>
    ) {
        super(meetingBackgroundImagesRepository);
    }

    findAllForUser (userId: number): Promise<MeetingBackgroundImage[]> {
        return this.meetingBackgroundImagesRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }
}
