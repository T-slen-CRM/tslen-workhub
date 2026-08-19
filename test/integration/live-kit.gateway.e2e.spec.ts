import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import * as io from 'socket.io-client';
import { LiveKitGateway, LiveKitEvents } from '../../src/resources/live-kit/gateway/live-kit.gateway';

describe('LiveKitGateway (e2e)', () => {
    let app: INestApplication;
    let socket1: ReturnType<typeof io.connect>;
    let socket2: ReturnType<typeof io.connect>;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            providers: [
                LiveKitGateway,
                {
                    provide: JwtService,
                    useValue: {
                        verify: jest.fn().mockReturnValue({ userId: 'test-user' }),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('secret'),
                    },
                },
                {
                    provide: Reflector,
                    useValue: {
                        getAllAndOverride: jest.fn().mockReturnValue(true), // AuthGuard access allowed
                    },
                },
                {
                    provide: APP_GUARD,
                    useValue: {
                        canActivate: jest.fn().mockReturnValue(true),
                    },
                },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
        await app.listen(3010);
    });

    afterEach(() => {
        if (socket1?.connected) socket1.disconnect();
        if (socket2?.connected) socket2.disconnect();
    });

    afterAll(async () => {
        await app.close();
    });

    // Production always sends numeric userIds (the Users entity's numeric `id` — see
    // live-kitWebSocket.service.ts's `{ userId: authData.id }`). LiveKitGateway.register()
    // coerces its registration key with Number(...), so these fixtures use numeric ids
    // throughout to match real client behavior.
    const createSocket = (userId: number) =>
        io.connect('http://localhost:3010/live-kit', {
            transports: ['websocket'],
            forceNew: true,
            query: { userId: String(userId) },
        });

    it('should connect and register two users, then emit online users', (done) => {
        socket1 = createSocket(1);
        socket2 = createSocket(2);

        let received1 = false;
        let received2 = false;

        const checkDone = () => {
            if (received1 && received2) {
                done();
            }
        };

        const handler1 = (msg: string) => {
            const parsed = JSON.parse(msg);
            if (parsed.users.includes(1) && parsed.users.includes(2)) {
                received1 = true;
                socket1.off(LiveKitEvents.ONLINE_USERS, handler1);
                checkDone();
            }
        };
        const handler2 = (msg: string) => {
            const parsed = JSON.parse(msg);
            if (parsed.users.includes(1) && parsed.users.includes(2)) {
                received2 = true;
                socket2.off(LiveKitEvents.ONLINE_USERS, handler2);
                checkDone();
            }
        };
        socket1.on('connect', () => {
            socket1.on(LiveKitEvents.ONLINE_USERS, handler1);
            socket1.emit(LiveKitEvents.REGISTER, { userId: 1 });
        });
        socket2.on('connect', () => {
            socket2.on(LiveKitEvents.ONLINE_USERS, handler2);
            socket2.emit(LiveKitEvents.REGISTER, { userId: 2 });
        });
    });

    it('should emit an incoming_call to callee', (done) => {
        socket1 = createSocket(10);
        socket2 = createSocket(20);

        socket1.on('connect', () => {
            socket1.emit(LiveKitEvents.REGISTER, { userId: 10 });
        });

        socket2.on('connect', () => {
            socket2.emit(LiveKitEvents.REGISTER, { userId: 20 });

            setTimeout(() => {
                socket1.emit(LiveKitEvents.INCOMING_CALL, {
                    calleeId: 20,
                    callerId: 10,
                    callerName: 'John',
                    callerLastName: 'Doe',
                    img: 'img-url',
                });
            }, 200);
        });
        socket2.on(LiveKitEvents.INCOMING_CALL, (payload) => {
            expect(payload).toEqual({
                callerId: 10,
                callerName: 'John',
                callerLastName: 'Doe',
                calleeId: 20,
                img: 'img-url',
            });
            done();
        });
    });
    it('should emit call_accepted back to caller', (done) => {
        socket1 = createSocket(10);
        socket2 = createSocket(20);

        socket1.on('connect', () => {
            socket1.emit(LiveKitEvents.REGISTER, { userId: 10 });
        });

        socket2.on('connect', () => {
            socket2.emit(LiveKitEvents.REGISTER, { userId: 20 });

            setTimeout(() => {
                socket2.emit(LiveKitEvents.CALL_ACCEPTED, {
                    callerId: 10,
                    calleeId: 20,
                });
            }, 200);
        });
        socket1.on(LiveKitEvents.CALL_ACCEPTED, (payload) => {
            expect(payload).toEqual({
                callerId: 10,
                calleeId: 20,
            });
            done();
        });
    });
});
