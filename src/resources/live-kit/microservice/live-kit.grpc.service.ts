import { Injectable } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';
import { CreateLiveKitDto } from '../dto/create-live-kit.dto';


@Injectable()
export class LiveKitGrpcService {
    async serviceGrpc (data: CreateLiveKitDto) {
        const { roomName, participantName } = data;
        const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env
        const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity: participantName,
        });

        at.addGrant({
            roomJoin: true,
            room: roomName,
        });

        const token = await at.toJwt();
        return { token };
    }

}
