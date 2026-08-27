import { ExecutionContext, GoneException, NotFoundException } from '@nestjs/common';
import { MeetingGuestGuard } from '../../../../src/resources/meeting-links/guards/meeting-guest.guard';
import { MeetingLinksService } from '../../../../src/resources/meeting-links/meeting-links.service';
import { MeetingLink } from '../../../../src/resources/meeting-links/entities/meeting-link.entity';

describe('MeetingGuestGuard', () => {
    let guard: MeetingGuestGuard;
    let service: jest.Mocked<Pick<MeetingLinksService, 'validateToken'>>;

    beforeEach(() => {
        service = { validateToken: jest.fn() };
        guard = new MeetingGuestGuard(service as unknown as MeetingLinksService);
    });

    function contextWithToken (token: string): { context: ExecutionContext; request: Record<string, unknown> } {
        const request: Record<string, unknown> = { params: { token } };
        const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
        return { context, request };
    }

    it('attaches a guest identity (not request.user) for a valid token', async () => {
        const link = { id: 1, roomName: 'meeting-abc' } as MeetingLink;
        service.validateToken.mockResolvedValue(link);
        const { context, request } = contextWithToken('plain-token');

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(request['guest']).toEqual({ roomName: 'meeting-abc', meetingLinkId: 1 });
        expect(request['user']).toBeUndefined();
    });

    it('propagates NotFoundException for an unknown token (never 401)', async () => {
        service.validateToken.mockRejectedValue(new NotFoundException());
        const { context } = contextWithToken('unknown');

        await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    });

    it('propagates GoneException for an expired/revoked token (never 401)', async () => {
        service.validateToken.mockRejectedValue(new GoneException());
        const { context } = contextWithToken('expired');

        await expect(guard.canActivate(context)).rejects.toThrow(GoneException);
    });
});
