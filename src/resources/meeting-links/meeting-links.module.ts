import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingLinksController } from './meeting-links.controller';
import { MeetingLinksService } from './meeting-links.service';
import { MeetingLinksRepository } from './meeting-links.repository';
import { MeetingLink } from './entities/meeting-link.entity';
import { MeetingGuestGuard } from './guards/meeting-guest.guard';
import { LiveKitModule } from '../live-kit/live-kit.module';

@Module({
    imports: [TypeOrmModule.forFeature([MeetingLink]), LiveKitModule],
    controllers: [MeetingLinksController],
    providers: [MeetingLinksService, MeetingLinksRepository, MeetingGuestGuard],
})
export class MeetingLinksModule {}
