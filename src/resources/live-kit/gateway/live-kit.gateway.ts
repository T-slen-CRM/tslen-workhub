import { UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import {
    MessageBody, ConnectedSocket,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

export const enum LiveKitEvents  {
  REGISTER = 'register',
  INCOMING_CALL = 'incoming_call',
  CALL_ACCEPTED = 'call_accepted',
  CALL_REJECTED = 'call_rejected',
  ONLINE_USERS = 'online_users',
  NOTIFICATION = 'notification',
}

@WebSocketGateway({
    namespace: 'live-kit',
    cors: {
        origin: '*',
    },
})

export class LiveKitGateway {
    public users: Map<number, Socket> = new Map();
    @WebSocketServer()
        server: Server;


    @UsePipes(new ValidationPipe({ transform: true }))
    @SubscribeMessage(LiveKitEvents.REGISTER)
    async register (@MessageBody() data, @ConnectedSocket() client: Socket) {
        const userId = Number(data.userId);
        this.users.set(userId, client);
        this.broadcastOnlineUsers()
        return undefined;
    }


    @UsePipes(new ValidationPipe({ transform: true }))
    @SubscribeMessage(LiveKitEvents.INCOMING_CALL)
    async incoling (@MessageBody() data) {
        const callee = this.users.get(Number(data.calleeId))
        if (callee){
            const payload = {
                callerId: data.callerId,
                callerName: data.callerName,
                callerLastName: data.callerLastName,
                calleeId: data.calleeId,
                img: data.img
            }
            callee.emit(LiveKitEvents.INCOMING_CALL, payload);
        }
        return undefined;
    }


    @UsePipes(new ValidationPipe({ transform: true }))
    @SubscribeMessage(LiveKitEvents.CALL_ACCEPTED)
    async accept (@MessageBody() data) {
        const caller = this.users.get(Number(data.callerId))
        if (caller){
            const payload = {
                calleeId: data.calleeId,
                callerId: data.callerId
            }
            caller.emit(LiveKitEvents.CALL_ACCEPTED, payload);
        }
        return undefined;
    }


    @UsePipes(new ValidationPipe({ transform: true }))
    @SubscribeMessage(LiveKitEvents.CALL_REJECTED)
    async reject (@MessageBody() data) {
        const reject = this.users.get(Number(data.callerId))
        if (reject){
            const payload = {
                calleeId: data.calleeId,
                callerId: data.callerId
            }
            reject.emit(LiveKitEvents.CALL_REJECTED, payload)
        }
        return undefined;
    }

    private broadcastOnlineUsers () {
        const onlineUserIds = Array.from(this.users.keys());
        const message = JSON.stringify({
            users: onlineUserIds
        });
        const uniqueSockets = new Set(this.users.values());

        for (const ws of uniqueSockets) {
            ws.emit(LiveKitEvents.ONLINE_USERS, message);
        }
    }

    public notifyUser (userId: number, payload: unknown): void {
        const socket = this.users.get(Number(userId));
        if (socket) {
            socket.emit(LiveKitEvents.NOTIFICATION, payload);
        }
    }

}
