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

    const createSocket = (userId: string) =>
        io.connect('http://localhost:3010/live-kit', {
            transports: ['websocket'],
            forceNew: true,
            query: { userId },
        });

    it('should connect and register two users, then emit online users', (done) => {
        socket1 = createSocket('user1');
        socket2 = createSocket('user2');

        let received1 = false;
        let received2 = false;

        const checkDone = () => {
            if (received1 && received2) {
                done();
            }
        };

        const handler1 = (msg: string) => {
            const parsed = JSON.parse(msg);
            if (parsed.users.includes('user1') && parsed.users.includes('user2')) {
                received1 = true;
                socket1.off(LiveKitEvents.ONLINE_USERS, handler1);
                checkDone();
            }
        };
        const handler2 = (msg: string) => {
            const parsed = JSON.parse(msg);
            if (parsed.users.includes('user1') && parsed.users.includes('user2')) {
                received2 = true;
                socket2.off(LiveKitEvents.ONLINE_USERS, handler2);
                checkDone();
            }
        };
        socket1.on('connect', () => {
            socket1.on(LiveKitEvents.ONLINE_USERS, handler1);
            socket1.emit(LiveKitEvents.REGISTER, { userId: 'user1' });
        });
        socket2.on('connect', () => {
            socket2.on(LiveKitEvents.ONLINE_USERS, handler2);
            socket2.emit(LiveKitEvents.REGISTER, { userId: 'user2' });
        });
    });

    it('should emit an incoming_call to callee', (done) => {
        socket1 = createSocket('caller');
        socket2 = createSocket('callee');

        socket1.on('connect', () => {
            socket1.emit(LiveKitEvents.REGISTER, { userId: 'caller' });
        });

        socket2.on('connect', () => {
            socket2.emit(LiveKitEvents.REGISTER, { userId: 'callee' });

            setTimeout(() => {
                socket1.emit(LiveKitEvents.INCOMING_CALL, {
                    calleeId: 'callee',
                    callerId: 'caller',
                    callerName: 'John',
                    callerLastName: 'Doe',
                    img: 'img-url',
                });
            }, 200);
        });
        socket2.on(LiveKitEvents.INCOMING_CALL, (payload) => {
            expect(payload).toEqual({
                callerId: 'caller',
                callerName: 'John',
                callerLastName: 'Doe',
                calleeId: 'callee',
                img: 'img-url',
            });
            done();
        });
    });
    it('should emit call_accepted back to caller', (done) => {
        socket1 = createSocket('caller');
        socket2 = createSocket('callee');

        socket1.on('connect', () => {
            socket1.emit(LiveKitEvents.REGISTER, { userId: 'caller' });
        });

        socket2.on('connect', () => {
            socket2.emit(LiveKitEvents.REGISTER, { userId: 'callee' });

            setTimeout(() => {
                socket2.emit(LiveKitEvents.CALL_ACCEPTED, {
                    callerId: 'caller',
                    calleeId: 'callee',
                });
            }, 200);
        });
        socket1.on(LiveKitEvents.CALL_ACCEPTED, (payload) => {
            expect(payload).toEqual({
                callerId: 'caller',
                calleeId: 'callee',
            });
            done();
        });
    });
});
