import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Socket } from 'socket.io';
import { AuthGuard } from '../../../../src/resources/auth/guards/auth.guard';

describe('AuthGuard', () => {
    let guard: AuthGuard;
    let jwtService: { verifyAsync: jest.Mock };
    let configService: { get: jest.Mock };
    let reflector: { getAllAndOverride: jest.Mock };

    beforeEach(() => {
        jwtService = { verifyAsync: jest.fn() };
        configService = { get: jest.fn().mockReturnValue('secret') };
        reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
        guard = new AuthGuard(jwtService as any, configService as any, reflector as any);
    });

    function contextFor (request: unknown): ExecutionContext {
        return {
            getHandler: () => ({}),
            getClass: () => ({}),
            switchToHttp: () => ({ getRequest: () => request }),
        } as unknown as ExecutionContext;
    }

    // socket.io's Socket class is what request instanceof Socket checks against -
    // stamp a plain object with its prototype rather than standing up a real
    // socket, matching this codebase's existing guard-test style.
    function fakeSocket (handshake: { headers?: Record<string, string>; auth?: Record<string, unknown> }): Socket {
        const socket = { handshake: { headers: handshake.headers ?? {}, auth: handshake.auth ?? {} } };
        Object.setPrototypeOf(socket, Socket.prototype);
        return socket as unknown as Socket;
    }

    it('authenticates a plain HTTP request from its Authorization header', async () => {
        jwtService.verifyAsync.mockResolvedValue({ user: { id: 1 } });
        const request: Record<string, unknown> = { headers: { authorization: 'Bearer a-jwt' } };

        const result = await guard.canActivate(contextFor(request));

        expect(result).toBe(true);
        expect(request.user).toEqual({ id: 1 });
        expect(jwtService.verifyAsync).toHaveBeenCalledWith('a-jwt', { secret: 'secret' });
    });

    it('rejects an HTTP request with no Authorization header', async () => {
        const request = { headers: {} };

        await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('authenticates a socket connection from handshake.auth.token', async () => {
        jwtService.verifyAsync.mockResolvedValue({ user: { id: 7 } });
        const socket = fakeSocket({ auth: { token: 'a-jwt' } });

        const result = await guard.canActivate(contextFor(socket));

        expect(result).toBe(true);
        expect((socket as unknown as { user: unknown }).user).toEqual({ id: 7 });
        expect(jwtService.verifyAsync).toHaveBeenCalledWith('a-jwt', { secret: 'secret' });
    });

    it('falls back to handshake.headers.authorization when handshake.auth.token is absent', async () => {
        jwtService.verifyAsync.mockResolvedValue({ user: { id: 7 } });
        const socket = fakeSocket({ headers: { authorization: 'Bearer a-jwt' } });

        const result = await guard.canActivate(contextFor(socket));

        expect(result).toBe(true);
        expect(jwtService.verifyAsync).toHaveBeenCalledWith('a-jwt', { secret: 'secret' });
    });

    it('rejects a socket connection with neither handshake.auth.token nor an Authorization header', async () => {
        const socket = fakeSocket({});

        await expect(guard.canActivate(contextFor(socket))).rejects.toBeInstanceOf(UnauthorizedException);
        expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('allows a public route through without checking for a token', async () => {
        reflector.getAllAndOverride.mockReturnValue(true);
        const request = { headers: {} };

        const result = await guard.canActivate(contextFor(request));

        expect(result).toBe(true);
        expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });
});
