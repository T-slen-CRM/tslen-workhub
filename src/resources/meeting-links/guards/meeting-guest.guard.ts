import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { MeetingLinksService } from '../meeting-links.service';

@Injectable()
export class MeetingGuestGuard implements CanActivate {
    constructor (private readonly meetingLinksService: MeetingLinksService) {}

    async canActivate (context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = request.params.token;
        const link = await this.meetingLinksService.validateToken(token);
        request['guest'] = { roomName: link.roomName, meetingLinkId: link.id };
        return true;
    }
}
