import { Body, Controller, Delete, Get, Inject, OnModuleInit, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { Request } from 'express';
import { randomUUID } from 'crypto';
import { MeetingLinksService } from './meeting-links.service';
import { CreateMeetingLinkDto } from './dto/create-meeting-link.dto';
import { JoinMeetingDto } from './dto/join-meeting.dto';
import { MeetingGuestGuard } from './guards/meeting-guest.guard';
import { SkipAuth } from '../auth/decorators/public.guard';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';
import { LiveKitTokenMicroservice } from '../live-kit/live-kit-token.controller';

@Controller('meeting-links')
export class MeetingLinksController implements OnModuleInit {
    private livekitService: LiveKitTokenMicroservice;

    constructor (
        private readonly meetingLinksService: MeetingLinksService,
        @Inject('LIVEKIT_PACKAGE') private readonly liveKitClient: ClientGrpc,
    ) {}

    onModuleInit () {
        this.livekitService = this.liveKitClient.getService<LiveKitTokenMicroservice>('LiveKitMicroservice');
    }

    @Post()
    create (
        @Body() dto: CreateMeetingLinkDto,
        @User() user: Users,
    ) {
        return this.meetingLinksService.createLink(user, dto);
    }

    @Get()
    findAll (@User() user: Users) {
        return this.meetingLinksService.findAllForHost(user.id);
    }

    @Delete(':id')
    revoke (
        @Param('id', ParseIntPipe) id: number,
        @User() user: Users,
    ): Promise<void> {
        return this.meetingLinksService.revoke(id, user.id);
    }

    @Get('public/:token')
    @SkipAuth()
    async getPublicInfo (@Param('token') token: string) {
        const link = await this.meetingLinksService.validateToken(token);
        return {
            title: link.title,
            hostName: `${link.host.firstName} ${link.host.lastName}`,
            roomName: link.roomName,
        };
    }

    @Post(':token/join')
    @SkipAuth()
    @UseGuards(MeetingGuestGuard)
    async join (
        @Body() dto: JoinMeetingDto,
        @Req() request: Request,
    ): Promise<{ livekitToken: string; roomName: string }> {
        const { roomName } = request['guest'] as { roomName: string; meetingLinkId: number };
        const participantName = `${dto.displayName}-${randomUUID().slice(0, 8)}`;
        const obs = this.livekitService.LiveKitToken({ roomName, participantName });
        const response = await lastValueFrom(obs);
        return { livekitToken: response.token, roomName };
    }
}
